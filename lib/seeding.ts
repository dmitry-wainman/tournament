import { StandingRow } from "./standings";
import { timesPlayed } from "./pairings";

export interface SeededGroup {
  groupNumber: number;
  playerIds: string[]; // 4 or 3 players — never 2
  hasRepeatOpponent: boolean; // flagged true if we had to relax the constraint
}

/**
 * Seeds players into groups of 4 (and 3, if the count doesn't divide evenly)
 * based on current standing (best-ranked first), avoiding repeat opponents
 * where possible.
 *
 * Group sizes are always 3 or 4, never smaller. If N players don't divide
 * evenly by 4, letting R = N % 4, exactly (4 - R) % 4 groups are sized 3
 * instead of 4 (this is the minimal number of "downsizes" that makes the
 * total work out — e.g. R=3 needs 1 group of 3, R=1 needs 3 groups of 3).
 * Those groups of 3 are the LAST (weakest) groups, so the strongest players
 * always play in full groups of 4.
 *
 * @param standings   sorted best-to-worst (see computeStandingsWithAllPlayers)
 * @param history     pairing history map from loadPairingHistory()
 */
export function seedRound(
  standings: StandingRow[],
  history: Map<string, number>
): SeededGroup[] {
  const remaining = standings.map((s) => s.playerId);
  const n = remaining.length;
  const r = n % 4;
  const numTriples = r === 0 ? 0 : 4 - r;
  const numQuads = (n - numTriples * 3) / 4;

  if (numQuads < 0) {
    throw new Error(
      `Cannot split ${n} players into groups of only 3 or 4 — add or remove a player and try again.`
    );
  }

  const groups: SeededGroup[] = [];
  let groupNumber = 1;

  // Strongest players first, in full groups of 4.
  for (let g = 0; g < numQuads; g++) {
    groups.push(buildNextGroup(remaining, history, 4, groupNumber++));
  }

  // Weakest players last, in groups of 3.
  for (let g = 0; g < numTriples; g++) {
    groups.push(buildNextGroup(remaining, history, 3, groupNumber++));
  }

  return groups;
}

/** Builds one group of the given size from the front of `remaining` (best-standing first), mutating `remaining`. */
function buildNextGroup(
  remaining: string[],
  history: Map<string, number>,
  size: number,
  groupNumber: number
): SeededGroup {
  const seed = remaining[0];
  const group = tryBuildGroup(seed, remaining, history, size);

  if (group) {
    for (const id of group) removeFrom(remaining, id);
    return { groupNumber, playerIds: group, hasRepeatOpponent: false };
  }

  // No valid repeat-free group could be built starting from this seed.
  // Fall back: build the group choosing candidates with the FEWEST prior
  // meetings against the current group, closest in standing.
  const relaxed = buildGroupWithRelaxedConstraint(seed, remaining, history, size);
  for (const id of relaxed) removeFrom(remaining, id);
  return { groupNumber, playerIds: relaxed, hasRepeatOpponent: true };
}

/** Attempts to build a repeat-free group of `size` starting from `seed`, via DFS/backtracking. */
function tryBuildGroup(
  seed: string,
  pool: string[],
  history: Map<string, number>,
  size: number
): string[] | null {
  const candidates = pool.filter((id) => id !== seed);
  return dfs([seed], candidates, history, size);
}

function dfs(
  group: string[],
  candidates: string[],
  history: Map<string, number>,
  size: number
): string[] | null {
  if (group.length === size) return group;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const conflicts = group.some((g) => timesPlayed(history, g, candidate) > 0);
    if (conflicts) continue;

    const nextCandidates = [...candidates.slice(0, i), ...candidates.slice(i + 1)];
    const result = dfs([...group, candidate], nextCandidates, history, size);
    if (result) return result;
    // else: backtrack, try the next candidate
  }

  return null; // no valid completion found from this state
}

/**
 * Fallback when a strict repeat-free group is impossible: greedily pick the
 * remaining players (closest in standing order) with the fewest total prior
 * meetings against the seed and each other, until the group reaches `size`.
 */
function buildGroupWithRelaxedConstraint(
  seed: string,
  pool: string[],
  history: Map<string, number>,
  size: number
): string[] {
  const candidates = pool.filter((id) => id !== seed);
  const group = [seed];

  while (group.length < size && candidates.length > 0) {
    // Score each candidate by total prior meetings against current group members.
    // Lower is better; ties broken by original standing order (earlier = closer rank).
    let bestIdx = 0;
    let bestScore = Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const score = group.reduce(
        (sum, g) => sum + timesPlayed(history, g, candidates[i]),
        0
      );
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    group.push(candidates[bestIdx]);
    candidates.splice(bestIdx, 1);
  }

  return group;
}

function removeFrom(arr: string[], id: string) {
  const idx = arr.indexOf(id);
  if (idx !== -1) arr.splice(idx, 1);
}
