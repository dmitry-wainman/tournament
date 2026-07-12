import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface StandingRow {
  playerId: string;
  playerName: string;
  roundsPlayed: number;
  sumRank: number;    // lower is better (like golf scoring)
  sumPoints: number;  // higher is better (tiebreaker)
}

/**
 * Computes current standings for a tournament from all completed rounds.
 * Sort order: sumRank ascending, then sumPoints descending.
 */
export async function computeStandings(tournamentId: string): Promise<StandingRow[]> {
  const results = await prisma.matchResult.findMany({
    where: {
      match: {
        group: {
          round: {
            tournamentId,
            status: "COMPLETED",
          },
        },
      },
    },
    include: { player: true },
  });

  const byPlayer = new Map<string, StandingRow>();

  for (const r of results) {
    const existing = byPlayer.get(r.playerId);
    if (existing) {
      existing.roundsPlayed += 1;
      existing.sumRank += r.rank;
      existing.sumPoints += r.pointsScored;
    } else {
      byPlayer.set(r.playerId, {
        playerId: r.playerId,
        playerName: r.player.name,
        roundsPlayed: 1,
        sumRank: r.rank,
        sumPoints: r.pointsScored,
      });
    }
  }

  return Array.from(byPlayer.values()).sort((a, b) => {
    if (a.sumRank !== b.sumRank) return a.sumRank - b.sumRank; // lower rank sum wins
    return b.sumPoints - a.sumPoints; // higher points wins tiebreak
  });
}

/**
 * Standings including players who haven't played yet (e.g. before round 1),
 * useful for seeding round 1 alphabetically/randomly since there's no history yet.
 */
export async function computeStandingsWithAllPlayers(
  tournamentId: string,
  allPlayerIds: string[]
): Promise<StandingRow[]> {
  const played = await computeStandings(tournamentId);
  const playedIds = new Set(played.map((s) => s.playerId));
  const unplayed = allPlayerIds.filter((id) => !playedIds.has(id));

  if (unplayed.length === 0) return played;

  const players = await prisma.player.findMany({ where: { id: { in: unplayed } } });
  const unplayedRows: StandingRow[] = players.map((p) => ({
    playerId: p.id,
    playerName: p.name,
    roundsPlayed: 0,
    sumRank: 0,
    sumPoints: 0,
  }));

  // Players with no games yet are treated as tied at the top for round-1 seeding purposes.
  return [...played, ...unplayedRows];
}
