import { StandingRow } from "./standings";
import { timesPlayed } from "./pairings";

export interface SeededGroup {
  groupNumber: number;
  playerIds: string[];
  hasRepeatOpponent: boolean; // flagged true if we had to relax the constraint
}

/**
 * Seeds players into groups of 4 based on current standing (best-ranked first),
 * avoiding repeat opponents where possible. Uses greedy grouping with local
 * backtracking; falls back to the least-bad repeat only if no valid grouping exists.
 *
 * @param standings   sorted best-to-worst (see computeStandingsWithAllPlayers)
 * @param history     pairing history map from loadPairingHistory()
 */
export function seedRound(
  standings: StandingRow[],
  history: Map<string, number>
): SeededGroup[] {
  const remaining = standings.map((s) => s.playerId);
  const groups: SeededGroup[] = [];
  let groupNumber = 1;

  while (remaining.length > 0) {
    // Handle final leftover players that don't make a full group of 4.
    if (remaining.length <= 4) {
      const playerIds = remaining.splice(0, remaining.length);
      groups.push({
        groupNumber: groupNumber++,
        playerIds,
        hasRepeatOpponent: hasAnyRepeat(playerIds, history),
      });
      break;
    }

    const seed = remaining[0];
    const group = tryBuildGroup(seed, remaining, history);

    if (group) {
      groups.push({ groupNumber: groupNumber++, playerIds: group, hasRepeatOpponent: false });
      for (const id of group) removeFrom(remaining, id);
    } else {
      // No valid repeat-free group could be built starting from this seed.
      // Fall back: build the group choosing candidates with the FEWEST prior
      // meetings against the current group, closest in standing.
      const relaxed = buildGroupWithRelaxedConstraint(seed, remaining, history);
      groups.push({ groupNumber: groupNumber++, playerIds: relaxed, hasRepeatOpponent: true });
      for (const id of relaxed) removeFrom(remaining, id);
    }
  }

  return groups;
}

/** Attempts to build a repeat-free group of 4 starting from `seed`, via DFS/backtracking. */
function tryBuildGroup(
  seed: string,
  pool: string[],
  history: Map<string, number>
): string[] | null {
  const candidates = pool.filter((id) => id !== seed);
  return dfs([seed], candidates, history);
}

function dfs(
  group: string[],
  candidates: string[],
  history: Map<string, number>
): string[] | null {
  if (group.length === 4) return group;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const conflicts = group.some((g) => timesPlayed(history, g, candidate) > 0);
    if (conflicts) continue;

    const nextCandidates = [...candidates.slice(0, i), ...candidates.slice(i + 1)];
    const result = dfs([...group, candidate], nextCandidates, history);
    if (result) return result;
    // else: backtrack, try the next candidate
  }

  return null; // no valid completion found from this state
}

/**
 * Fallback when a strict repeat-free group is impossible: greedily pick the
 * 3 remaining players (closest in standing order) with the fewest total
 * prior meetings against the seed and each other.
 */
function buildGroupWithRelaxedConstraint(
  seed: string,
  pool: string[],
  history: Map<string, number>
): string[] {
  const candidates = pool.filter((id) => id !== seed);
  const group = [seed];

  while (group.length < 4 && candidates.length > 0) {
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

function hasAnyRepeat(playerIds: string[], history: Map<string, number>): boolean {
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      if (timesPlayed(history, playerIds[i], playerIds[j]) > 0) return true;
    }
  }
  return false;
}

function removeFrom(arr: string[], id: string) {
  const idx = arr.indexOf(id);
  if (idx !== -1) arr.splice(idx, 1);
}
