import { prisma } from "@/lib/prisma";


/** Canonical (A, B) ordering so (x,y) and (y,x) map to the same DB row. */
function canonicalPair(playerAId: string, playerBId: string): [string, string] {
  return playerAId < playerBId ? [playerAId, playerBId] : [playerBId, playerAId];
}

/**
 * Loads all pairing counts for a tournament into memory as a Map,
 * keyed by "playerAId|playerBId" (canonical order), for fast lookups
 * during seeding without hitting the DB per comparison.
 */
export async function loadPairingHistory(tournamentId: string): Promise<Map<string, number>> {
  const rows = await prisma.playerPairing.findMany({ where: { tournamentId } });
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(`${row.playerAId}|${row.playerBId}`, row.timesPlayed);
  }
  return map;
}

export function timesPlayed(
  history: Map<string, number>,
  playerAId: string,
  playerBId: string
): number {
  const [a, b] = canonicalPair(playerAId, playerBId);
  return history.get(`${a}|${b}`) ?? 0;
}

/** Call after a round's matches are finalized to update pairing counts for every pair within each group. */
export async function recordPairingsForGroup(tournamentId: string, playerIds: string[]) {
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      const [a, b] = canonicalPair(playerIds[i], playerIds[j]);
      await prisma.playerPairing.upsert({
        where: { tournamentId_playerAId_playerBId: { tournamentId, playerAId: a, playerBId: b } },
        create: { tournamentId, playerAId: a, playerBId: b, timesPlayed: 1 },
        update: { timesPlayed: { increment: 1 } },
      });
    }
  }
}
