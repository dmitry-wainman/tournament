import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


// POST body: { playerIds: string[] }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const tournamentId = params.id;
  const { playerIds }: { playerIds: string[] } = await req.json();

  if (!Array.isArray(playerIds) || playerIds.length === 0) {
    return NextResponse.json({ error: "playerIds must be a non-empty array" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  if (tournament.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Players can only be assigned while the tournament is in draft (before round 1)" },
      { status: 400 }
    );
  }

  // skipDuplicates handles players already registered without erroring the whole batch
  await prisma.tournamentPlayer.createMany({
    data: playerIds.map((playerId) => ({ tournamentId, playerId })),
    skipDuplicates: true,
  });

  const registrations = await prisma.tournamentPlayer.findMany({
    where: { tournamentId, playerId: { in: playerIds } },
    include: { player: true },
  });

  return NextResponse.json({
    assigned: registrations.map((r) => ({ id: r.player.id, name: r.player.name })),
  });
}
