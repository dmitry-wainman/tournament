import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const registrations = await prisma.tournamentPlayer.findMany({
    where: { tournamentId: params.id },
    include: { player: true },
    orderBy: { registeredAt: "asc" },
  });

  return NextResponse.json({
    players: registrations.map((r) => ({
      id: r.player.id,
      name: r.player.name,
      registeredAt: r.registeredAt,
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const tournamentId = params.id;
  const { name } = await req.json();

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Player name is required" }, { status: 400 });
  }
  const trimmedName = name.trim();

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  if (tournament.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Players can only be added while the tournament is in draft (before round 1)" },
      { status: 400 }
    );
  }

  // Reuse an existing player with this exact name if one exists, otherwise create a new one.
  // (If you expect duplicate names across different people, switch this to always create new
  // and let the admin disambiguate by an added field like email or club.)
  let player = await prisma.player.findFirst({ where: { name: trimmedName } });
  if (!player) {
    player = await prisma.player.create({ data: { name: trimmedName } });
  }

  const existingRegistration = await prisma.tournamentPlayer.findUnique({
    where: { tournamentId_playerId: { tournamentId, playerId: player.id } },
  });
  if (existingRegistration) {
    return NextResponse.json({ error: `${trimmedName} is already registered` }, { status: 409 });
  }

  const registration = await prisma.tournamentPlayer.create({
    data: { tournamentId, playerId: player.id },
    include: { player: true },
  });

  return NextResponse.json(
    { player: { id: registration.player.id, name: registration.player.name } },
    { status: 201 }
  );
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const tournamentId = params.id;
  const { playerId } = await req.json();

  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  await prisma.tournamentPlayer.delete({
    where: { tournamentId_playerId: { tournamentId, playerId } },
  });

  return NextResponse.json({ ok: true });
}
