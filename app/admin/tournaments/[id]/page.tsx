import Link from "next/link";
import { notFound } from "next/navigation";
import PlayerManager from "./PlayerManager";
import TournamentActions from "./TournamentActions";
import RoundManager from "./RoundManager";
import { computeStandings } from "@/lib/standings";
import { prisma } from "@/lib/prisma";


export const dynamic = "force-dynamic";

export default async function TournamentDetailPage({ params }: { params: { id: string } }) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: params.id },
    include: {
      registrations: { include: { player: true }, orderBy: { registeredAt: "asc" } },
      rounds: {
        orderBy: { roundNumber: "asc" },
        include: {
          groups: {
            include: {
              groupPlayers: { include: { player: true } },
              match: { include: { results: true } },
            },
          },
        },
      },
    },
  });

  if (!tournament) notFound();

  const players = tournament.registrations.map((r) => ({ id: r.player.id, name: r.player.name }));

  const rounds = tournament.rounds.map((round) => ({
    id: round.id,
    roundNumber: round.roundNumber,
    status: round.status,
    groups: round.groups.map((group) => ({
      id: group.id,
      groupNumber: group.groupNumber,
      matchId: group.match!.id,
      players: group.groupPlayers.map((gp) => ({ id: gp.player.id, name: gp.player.name })),
      results: group.match!.results.map((r) => ({
        playerId: r.playerId,
        pointsScored: r.pointsScored,
        rank: r.rank,
      })),
    })),
  }));

  const lastRound = tournament.rounds[tournament.rounds.length - 1] ?? null;
  const standings = await computeStandings(tournament.id);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{tournament.name}</h1>
          <div className="list-row-meta" style={{ marginTop: 6 }}>
            <span className={`status-pill ${tournament.status.toLowerCase()}`}>
              {tournament.status}
            </span>
          </div>
        </div>
      </div>

      <TournamentActions
        tournamentId={tournament.id}
        status={tournament.status}
        playerCount={players.length}
        lastRoundStatus={lastRound?.status ?? null}
      />

      <PlayerManager
        tournamentId={tournament.id}
        initialPlayers={players}
        editable={tournament.status === "DRAFT"}
      />

      {tournament.status !== "DRAFT" && (
        <RoundManager tournamentId={tournament.id} tournamentStatus={tournament.status} rounds={rounds} />
      )}

      {standings.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 16 }}>
            {tournament.status === "PUBLISHED" ? "Final results" : "Current standings"}
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--ink-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.03em" }}>
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
                  <td style={{ padding: "8px" }}>{i + 1}</td>
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

      <div style={{ marginTop: 20 }}>
        <Link href="/admin/tournaments" className="btn btn-secondary">
          ← Back to tournaments
        </Link>
      </div>
    </>
  );
}
