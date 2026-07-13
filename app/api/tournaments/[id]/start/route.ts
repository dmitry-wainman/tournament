import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const tournamentId = params.id;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { _count: { select: { registrations: true } } },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  if (tournament.status !== "DRAFT") {
    return NextResponse.json({ error: "Tournament has already been started" }, { status: 400 });
  }
  if (tournament._count.registrations < 6) {
    return NextResponse.json(
      { error: "Need at least 6 registered players to start" },
      { status: 400 }
    );
  }

  const updated = await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "ACTIVE" },
  });

  return NextResponse.json({ tournament: updated });
}
