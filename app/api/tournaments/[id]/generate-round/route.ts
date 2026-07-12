import { NextRequest, NextResponse } from "next/server";
import { computeStandingsWithAllPlayers } from "@/lib/standings";
import { loadPairingHistory } from "@/lib/pairings";
import { seedRound } from "@/lib/seeding";
import { prisma } from "@/lib/prisma";


export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const tournamentId = params.id;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { rounds: { orderBy: { roundNumber: "desc" }, take: 1 } },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  if (tournament.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Start the tournament before generating a round" },
      { status: 400 }
    );
  }

  const lastRound = tournament.rounds[0];
  if (lastRound && lastRound.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Finalize the current round before generating the next one" },
      { status: 400 }
    );
  }

  const registrations = await prisma.tournamentPlayer.findMany({
    where: { tournamentId },
    select: { playerId: true },
  });
  const allPlayerIds = registrations.map((r) => r.playerId);

  if (allPlayerIds.length < 4) {
    return NextResponse.json(
      { error: "Need at least 4 registered players to generate a round" },
      { status: 400 }
    );
  }

  const standings = await computeStandingsWithAllPlayers(tournamentId, allPlayerIds);
  const history = await loadPairingHistory(tournamentId);
  const seededGroups = seedRound(standings, history);

  const nextRoundNumber = (lastRound?.roundNumber ?? 0) + 1;

  const round = await prisma.round.create({
    data: {
      tournamentId,
      roundNumber: nextRoundNumber,
      status: "ACTIVE",
      groups: {
        create: seededGroups.map((g) => ({
          groupNumber: g.groupNumber,
          groupPlayers: { create: g.playerIds.map((playerId) => ({ playerId })) },
          match: { create: {} }, // one match per group, per current schema
        })),
      },
    },
    include: { groups: { include: { groupPlayers: true, match: true } } },
  });

  const anyRepeats = seededGroups.some((g) => g.hasRepeatOpponent);

  return NextResponse.json({ round, warning: anyRepeats ? "Some groups include a repeat opponent — unavoidable given remaining pool." : null });
}
