import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { rounds: true } } },
  });
  return NextResponse.json({ tournaments });
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Tournament name is required" }, { status: 400 });
  }

  const tournament = await prisma.tournament.create({
    data: { name: name.trim(), status: "DRAFT" },
  });

  return NextResponse.json({ tournament }, { status: 201 });
}
