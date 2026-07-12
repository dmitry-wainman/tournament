import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ScoreInput {
  playerId: string;
  pointsScored: number;
}

interface RankedScore extends ScoreInput {
  rank: number;
}

/**
 * Fractional ranking: players tied on points share the average of the position
 * range they occupy, and the next distinct score continues after that range
 * (not compressed). E.g. points 200/100/100/50 -> ranks 1 / 2.5 / 2.5 / 4.
 */
function assignFractionalRanks(scores: ScoreInput[]): RankedScore[] {
  const sorted = [...scores].sort((a, b) => b.pointsScored - a.pointsScored);
  const result: RankedScore[] = [];

  let i = 0;
  while (i < sorted.length) {
    let j = i;
    // extend j while the next entries are tied on points with position i
    while (j + 1 < sorted.length && sorted[j + 1].pointsScored === sorted[i].pointsScored) {
      j++;
    }
    // positions i..j (0-indexed) correspond to 1-indexed ranks (i+1)..(j+1)
    const avgRank = (i + 1 + (j + 1)) / 2;
    for (let k = i; k <= j; k++) {
      result.push({ ...sorted[k], rank: avgRank });
    }
    i = j + 1;
  }

  return result;
}

// POST body: { scores: ScoreInput[] }  — exactly 4 entries, one per player in the match's group
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const matchId = params.id;
  const { scores }: { scores: ScoreInput[] } = await req.json();

  if (!scores || scores.length !== 4) {
    return NextResponse.json({ error: "Expected exactly 4 player scores" }, { status: 400 });
  }

  const ranked = assignFractionalRanks(scores);

  await prisma.$transaction(
    ranked.map((s) =>
      prisma.matchResult.upsert({
        where: { matchId_playerId: { matchId, playerId: s.playerId } },
        create: { matchId, playerId: s.playerId, pointsScored: s.pointsScored, rank: s.rank },
        update: { pointsScored: s.pointsScored, rank: s.rank },
      })
    )
  );

  return NextResponse.json({ ok: true, ranked });
}
