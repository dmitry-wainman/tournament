import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PlayerTournamentResultsPage({
  params,
}: {
  params: { id: string; playerId: string };
}) {
  const tournament = await prisma.tournament.findUnique({ where: { id: params.id } });
  if (!tournament || tournament.status === "DRAFT") notFound();

  const player = await prisma.player.findUnique({ where: { id: params.playerId } });
  if (!player) notFound();

  const results = await prisma.matchResult.findMany({
    where: {
      playerId: player.id,
      match: {
        group: {
          round: {
            tournamentId: tournament.id,
            status: "COMPLETED",
          },
        },
      },
    },
    include: {
      match: { include: { group: { include: { round: true } } } },
    },
  });

  const rounds = results
    .map((r) => ({
      roundNumber: r.match.group.round.roundNumber,
      groupNumber: r.match.group.groupNumber,
      pointsScored: r.pointsScored,
      rank: r.rank,
    }))
    .sort((a, b) => a.roundNumber - b.roundNumber);

  const sumRank = rounds.reduce((sum, r) => sum + r.rank, 0);
  const sumPoints = rounds.reduce((sum, r) => sum + r.pointsScored, 0);

  return (
    <div className="shell" style={{ paddingTop: 48 }}>
      <div style={{ marginBottom: 20, display: "flex", gap: 16 }}>
        <Link href={`/tournaments/${tournament.id}`} style={{ fontSize: 13, color: "var(--ink-muted)", textDecoration: "none" }}>
          ← {tournament.name}
        </Link>
        <Link href={`/players/${player.id}`} style={{ fontSize: 13, color: "var(--ink-muted)", textDecoration: "none" }}>
          {player.name}&apos;s profile →
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1>{player.name}</h1>
          <div className="list-row-meta" style={{ marginTop: 6 }}>
            {tournament.name}
          </div>
        </div>
      </div>

      {rounds.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No completed rounds yet</h3>
            <p>Results will appear here once {player.name} has played a finalized round.</p>
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
                <th style={{ padding: "6px 8px" }}>Round</th>
                <th style={{ padding: "6px 8px" }}>Group</th>
                <th style={{ padding: "6px 8px" }}>Score</th>
                <th style={{ padding: "6px 8px" }}>Rank</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => (
                <tr key={r.roundNumber} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px" }}>{r.roundNumber}</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}>
                    #{r.groupNumber}
                  </td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>{r.pointsScored}</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)", color: "var(--gold)", fontWeight: 600 }}>
                    {r.rank}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--line)", fontWeight: 600 }}>
                <td style={{ padding: "8px" }} colSpan={2}>
                  Total
                </td>
                <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>{sumPoints}</td>
                <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>{sumRank}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
