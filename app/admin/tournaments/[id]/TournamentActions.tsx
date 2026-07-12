"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TournamentActions({
  tournamentId,
  status,
  playerCount,
  lastRoundStatus,
}: {
  tournamentId: string;
  status: "DRAFT" | "ACTIVE" | "PUBLISHED";
  playerCount: number;
  lastRoundStatus: "PENDING" | "ACTIVE" | "COMPLETED" | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"start" | "finalize" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function callAction(path: string, key: "start" | "finalize") {
    setError(null);
    setLoading(key);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/${path}`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  if (status === "PUBLISHED") {
    return (
      <div className="card" style={{ marginTop: 20 }}>
        <p style={{ fontSize: 14, color: "var(--ink-muted)", margin: 0 }}>
          This tournament has been finalized and published. Final results are locked.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      {status === "DRAFT" && (
        <>
          <h3 style={{ marginBottom: 8 }}>Start tournament</h3>
          <p style={{ fontSize: 14, color: "var(--ink-muted)", marginBottom: 14 }}>
            {playerCount < 4
              ? `Need at least 4 players assigned (currently ${playerCount}).`
              : `${playerCount} players assigned. Starting locks the player list and enables round generation.`}
          </p>
          <button
            className="btn"
            disabled={playerCount < 4 || loading === "start"}
            onClick={() => callAction("start", "start")}
          >
            {loading === "start" ? "Starting…" : "Start tournament"}
          </button>
        </>
      )}

      {status === "ACTIVE" && (
        <>
          <h3 style={{ marginBottom: 8 }}>Finalize tournament</h3>
          <p style={{ fontSize: 14, color: "var(--ink-muted)", marginBottom: 14 }}>
            {lastRoundStatus !== "COMPLETED"
              ? "Finalize the current round before publishing final results."
              : "Publishes final standings and locks the tournament from further changes."}
          </p>
          <button
            className="btn"
            disabled={lastRoundStatus !== "COMPLETED" || loading === "finalize"}
            onClick={() => callAction("finalize", "finalize")}
          >
            {loading === "finalize" ? "Finalizing…" : "Finalize tournament"}
          </button>
        </>
      )}

      {error && <div className="error-text">{error}</div>}
    </div>
  );
}
