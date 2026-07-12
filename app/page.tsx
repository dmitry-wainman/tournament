import Link from "next/link";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export default async function Home() {
  const tournaments = await prisma.tournament.findMany({
    where: { status: { in: ["ACTIVE", "PUBLISHED"] } },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { registrations: true, rounds: true } } },
  });

  return (
    <div className="shell" style={{ paddingTop: 48 }}>
      <div className="page-header">
        <h1>Tournaments</h1>
      </div>

      {tournaments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No tournaments to show yet</h3>
            <p>Check back once a tournament is underway.</p>
          </div>
        </div>
      ) : (
        <div className="list">
          {tournaments.map((t) => {
            const isPublished = t.status === "PUBLISHED";
            const row = (
              <div className="list-row" style={{ cursor: isPublished ? "pointer" : "default" }}>
                <div>
                  <div className="list-row-name">{t.name}</div>
                  <div className="list-row-meta">
                    {t._count.registrations} players · {t._count.rounds} round
                    {t._count.rounds === 1 ? "" : "s"}
                  </div>
                </div>
                <span className={`status-pill ${t.status.toLowerCase()}`}>
                  {isPublished ? "Final results" : "In progress"}
                </span>
              </div>
            );

            return isPublished ? (
              <Link key={t.id} href={`/tournaments/${t.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                {row}
              </Link>
            ) : (
              <div key={t.id}>{row}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
