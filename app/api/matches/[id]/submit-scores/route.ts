import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


interface ScoreInput {
  playerId: string;
  pointsScored: number;
}

// POST body: { scores: ScoreInput[] }  — exactly 4 entries, one per player in the match's group
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const matchId = params.id;
  const { scores }: { scores: ScoreInput[] } = await req.json();

  if (!scores || scores.length !== 4) {
    return NextResponse.json({ error: "Expected exactly 4 player scores" }, { status: 400 });
  }

  // Rank 1 = highest pointsScored, ties broken by input order (adjust to your game's tiebreak rule)
  const ranked = [...scores].sort((a, b) => b.pointsScored - a.pointsScored);

  await prisma.$transaction(
    ranked.map((s, i) =>
      prisma.matchResult.upsert({
        where: { matchId_playerId: { matchId, playerId: s.playerId } },
        create: { matchId, playerId: s.playerId, pointsScored: s.pointsScored, rank: i + 1 },
        update: { pointsScored: s.pointsScored, rank: i + 1 },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
