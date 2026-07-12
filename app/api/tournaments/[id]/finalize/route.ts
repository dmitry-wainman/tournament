import { NextRequest, NextResponse } from "next/server";
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
      { error: "Only an active tournament can be finalized" },
      { status: 400 }
    );
  }
  if (tournament.rounds.length === 0) {
    return NextResponse.json({ error: "No rounds have been played yet" }, { status: 400 });
  }
  const lastRound = tournament.rounds[0];
  if (lastRound.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Finalize the current round before finalizing the tournament" },
      { status: 400 }
    );
  }

  const updated = await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "PUBLISHED" },
  });

  return NextResponse.json({ tournament: updated });
}
