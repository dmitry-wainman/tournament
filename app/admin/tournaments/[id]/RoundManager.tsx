"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PlayerRef {
  id: string;
  name: string;
}

interface ResultRef {
  playerId: string;
  pointsScored: number;
  rank: number;
}

interface GroupData {
  id: string;
  groupNumber: number;
  matchId: string;
  players: PlayerRef[];
  results: ResultRef[];
}

interface RoundData {
  id: string;
  roundNumber: number;
  status: "PENDING" | "ACTIVE" | "COMPLETED";
  groups: GroupData[];
}

function GroupScoreForm({ group, locked }: { group: GroupData; locked: boolean }) {
  const router = useRouter();
  const initialValues: Record<string, string> = {};
  for (const p of group.players) {
    const existing = group.results.find((r) => r.playerId === p.id);
    initialValues[p.id] = existing ? String(existing.pointsScored) : "";
  }

  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(group.results.length === 4);

  async function handleSave() {
    setError(null);
    const scores = group.players.map((p) => ({
      playerId: p.id,
      pointsScored: Number(values[p.id]),
    }));

    if (scores.some((s) => Number.isNaN(s.pointsScored))) {
      setError("Enter a numeric score for every player.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/matches/${group.matchId}/submit-scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save scores.");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  // Ranked preview, purely client-side, to show the admin how scores will rank before saving.
  // Mirrors the backend's fractional ranking: ties share the average of the positions they occupy.
  const entered = group.players
    .map((p) => ({ ...p, points: Number(values[p.id]) }))
    .filter((p) => !Number.isNaN(p.points) && values[p.id] !== "");
  const sortedEntered = [...entered].sort((a, b) => b.points - a.points);
  const rankByPlayerId = new Map<string, number>();
  {
    let i = 0;
    while (i < sortedEntered.length) {
      let j = i;
      while (j + 1 < sortedEntered.length && sortedEntered[j + 1].points === sortedEntered[i].points) j++;
      const avgRank = (i + 1 + (j + 1)) / 2;
      for (let k = i; k <= j; k++) rankByPlayerId.set(sortedEntered[k].id, avgRank);
      i = j + 1;
    }
  }

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 16, marginBottom: 12 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-muted)", marginBottom: 10 }}>
        GROUP {group.groupNumber}
        {saved && <span style={{ color: "var(--accent)", marginLeft: 8 }}>✓ saved</span>}
      </div>

      {group.players.map((p) => {
        const rank = rankByPlayerId.get(p.id);
        return (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ flex: 1, fontSize: 14 }}>{p.name}</span>
            {rank !== undefined && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold)" }}>
                #{rank}
              </span>
            )}
            <input
              type="number"
              step="any"
              disabled={locked}
              value={values[p.id]}
              onChange={(e) => setValues((prev) => ({ ...prev, [p.id]: e.target.value }))}
              placeholder="points"
              style={{
                width: 90,
                padding: "7px 10px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                fontSize: 14,
                background: locked ? "var(--bg)" : "var(--surface)",
                color: "var(--ink)",
              }}
            />
          </div>
        );
      })}

      {!locked && (
        <button className="btn btn-secondary" onClick={handleSave} disabled={saving} style={{ marginTop: 6 }}>
          {saving ? "Saving…" : "Save scores"}
        </button>
      )}
      {error && <div className="error-text">{error}</div>}
    </div>
  );
}

export default function RoundManager({
  tournamentId,
  tournamentStatus,
  rounds,
}: {
  tournamentId: string;
  tournamentStatus: "DRAFT" | "ACTIVE" | "PUBLISHED";
  rounds: RoundData[];
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastRound = rounds[rounds.length - 1] ?? null;
  const canGenerateNextRound = tournamentStatus === "ACTIVE" && (!lastRound || lastRound.status === "COMPLETED");
  const activeRound = lastRound && lastRound.status === "ACTIVE" ? lastRound : null;
  const allGroupsScored = activeRound?.groups.every((g) => g.results.length === g.players.length) ?? false;

  async function handleGenerateRound() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/generate-round`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not generate round.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleFinalizeRound() {
    if (!activeRound) return;
    setError(null);
    setFinalizing(true);
    try {
      const res = await fetch(`/api/rounds/${activeRound.id}/finalize`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not finalize round.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setFinalizing(false);
    }
  }

  if (tournamentStatus === "DRAFT") return null;

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h3 style={{ marginBottom: 16 }}>Rounds</h3>

      {rounds.length === 0 && (
        <p style={{ fontSize: 14, color: "var(--ink-muted)", marginBottom: 16 }}>
          No rounds yet.
        </p>
      )}

      {rounds.map((round) => (
        <div key={round.id} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <strong style={{ fontSize: 15 }}>Round {round.roundNumber}</strong>
            <span className={`status-pill ${round.status.toLowerCase()}`}>{round.status}</span>
          </div>

          {round.groups
            .sort((a, b) => a.groupNumber - b.groupNumber)
            .map((group) => (
              <GroupScoreForm key={group.id} group={group} locked={round.status === "COMPLETED"} />
            ))}

          {round.status === "ACTIVE" && (
            <button
              className="btn"
              onClick={handleFinalizeRound}
              disabled={!allGroupsScored || finalizing}
            >
              {finalizing ? "Finalizing…" : allGroupsScored ? "Finalize round" : "Enter all scores to finalize"}
            </button>
          )}
        </div>
      ))}

      {canGenerateNextRound && (
        <button className="btn" onClick={handleGenerateRound} disabled={generating}>
          {generating ? "Generating…" : rounds.length === 0 ? "Generate round 1" : "Generate next round"}
        </button>
      )}

      {error && <div className="error-text">{error}</div>}
    </div>
  );
}
