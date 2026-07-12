import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { computeStandings } from "@/lib/standings";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export default async function PublicTournamentPage({ params }: { params: { id: string } }) {
  const tournament = await prisma.tournament.findUnique({ where: { id: params.id } });

  // Draft tournaments aren't public at all; treat as not found.
  if (!tournament || tournament.status === "DRAFT") notFound();

  const isPublished = tournament.status === "PUBLISHED";
  const standings = isPublished ? await computeStandings(tournament.id) : [];

  return (
    <div className="shell" style={{ paddingTop: 48 }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/" style={{ fontSize: 13, color: "var(--ink-muted)", textDecoration: "none" }}>
          ← All tournaments
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1>{tournament.name}</h1>
          <div className="list-row-meta" style={{ marginTop: 6 }}>
            <span className={`status-pill ${tournament.status.toLowerCase()}`}>
              {isPublished ? "Final results" : "In progress"}
            </span>
          </div>
        </div>
      </div>

      {!isPublished ? (
        <div className="card">
          <div className="empty-state">
            <h3>Tournament still in progress</h3>
            <p>Final results will be posted here once the tournament is complete.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  color: "var(--ink-muted)",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                <th style={{ padding: "6px 8px" }}>#</th>
                <th style={{ padding: "6px 8px" }}>Player</th>
                <th style={{ padding: "6px 8px" }}>Rounds</th>
                <th style={{ padding: "6px 8px" }}>Sum of ranks</th>
                <th style={{ padding: "6px 8px" }}>Sum of points</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.playerId} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)", color: i < 3 ? "var(--gold)" : undefined, fontWeight: i < 3 ? 700 : 400 }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: "8px", fontWeight: 600 }}>{s.playerName}</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>{s.roundsPlayed}</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>{s.sumRank}</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>{s.sumPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
