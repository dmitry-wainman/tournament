import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { recordPairingsForGroup } from "@/lib/pairings";

const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const roundId = params.id;

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      groups: {
        include: { groupPlayers: true, match: { include: { results: true } } },
      },
    },
  });
  if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });

  // Guard: every group's match must have exactly 4 results before finalizing.
  const incomplete = round.groups.filter((g) => (g.match?.results.length ?? 0) !== 4);
  if (incomplete.length > 0) {
    return NextResponse.json(
      { error: `${incomplete.length} group(s) still missing scores` },
      { status: 400 }
    );
  }

  // Record pairing history for every group so the next round's seeding avoids repeats.
  for (const group of round.groups) {
    const playerIds = group.groupPlayers.map((gp) => gp.playerId);
    await recordPairingsForGroup(round.tournamentId, playerIds);
  }

  await prisma.round.update({ where: { id: roundId }, data: { status: "COMPLETED" } });

  return NextResponse.json({ ok: true });
}
