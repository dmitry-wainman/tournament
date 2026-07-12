import Link from "next/link";
import { prisma } from "@/lib/prisma";


export const dynamic = "force-dynamic"; // always show latest tournaments, no static caching

export default async function TournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { rounds: true } } },
  });

  return (
    <>
      <div className="page-header">
        <h1>Tournaments</h1>
        <Link href="/admin/tournaments/new" className="btn">
          + New tournament
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No tournaments yet</h3>
            <p>Create one to start seeding rounds and recording scores.</p>
          </div>
        </div>
      ) : (
        <div className="list">
          {tournaments.map((t) => (
            <Link key={t.id} href={`/admin/tournaments/${t.id}`} className="list-row">
              <div>
                <div className="list-row-name">{t.name}</div>
                <div className="list-row-meta">
                  {t._count.rounds} round{t._count.rounds === 1 ? "" : "s"} · created{" "}
                  {new Date(t.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span className={`status-pill ${t.status.toLowerCase()}`}>{t.status}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
