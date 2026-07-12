"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RegisteredPlayer {
  id: string;
  name: string;
}

export default function PlayerManager({
  tournamentId,
  initialPlayers,
  editable,
}: {
  tournamentId: string;
  initialPlayers: RegisteredPlayer[];
  editable: boolean;
}) {
  const router = useRouter();
  const [players, setPlayers] = useState(initialPlayers);
  const [roster, setRoster] = useState<RegisteredPlayer[] | null>(null); // all players in the system
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/players")
      .then((res) => res.json())
      .then((body) => setRoster(body.players))
      .catch(() => setError("Could not load player roster."));
  }, []);

  const registeredIds = new Set(players.map((p) => p.id));
  const unregisteredRoster = (roster ?? []).filter((p) => !registeredIds.has(p.id));

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAssignSelected() {
    if (selected.size === 0) return;
    setError(null);
    setAssigning(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/players/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerIds: Array.from(selected) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not assign players.");

      setPlayers((prev) => [...prev, ...body.assigned]);
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleCreateAndAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newName.trim()) {
      setError("Enter a player name.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not add player.");

      setPlayers((prev) => [...prev, body.player]);
      setRoster((prev) => (prev ? [...prev, body.player] : prev));
      setNewName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRemove(playerId: string) {
    setError(null);
    const previous = players;
    setPlayers((prev) => prev.filter((p) => p.id !== playerId)); // optimistic

    const res = await fetch(`/api/tournaments/${tournamentId}/players`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });

    if (!res.ok) {
      setPlayers(previous); // revert on failure
      setError("Could not remove player.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h3 style={{ marginBottom: 16 }}>Players ({players.length})</h3>

      {players.length === 0 ? (
        <p style={{ color: "var(--ink-muted)", fontSize: 14, marginBottom: 20 }}>
          No players assigned yet.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
          {players.map((p) => (
            <li
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "9px 0",
                borderBottom: "1px solid var(--line)",
                fontSize: 14,
              }}
            >
              {p.name}
              {editable && (
                <button
                  onClick={() => handleRemove(p.id)}
                  style={{
                    border: "none",
                    background: "none",
                    color: "var(--danger)",
                    cursor: "pointer",
                    fontSize: 13,
                    padding: "4px 8px",
                  }}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <>
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                marginBottom: 10,
              }}
            >
              Assign existing players
            </div>

            {roster === null ? (
              <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>Loading roster…</p>
            ) : unregisteredRoster.length === 0 ? (
              <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>
                Every player in the system is already assigned here. Add a new one below.
              </p>
            ) : (
              <>
                <div
                  style={{
                    maxHeight: 220,
                    overflowY: "auto",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    padding: 4,
                    marginBottom: 10,
                  }}
                >
                  {unregisteredRoster.map((p) => (
                    <label
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 10px",
                        fontSize: 14,
                        cursor: "pointer",
                        borderRadius: 4,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelected(p.id)}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
                <button
                  className="btn"
                  onClick={handleAssignSelected}
                  disabled={selected.size === 0 || assigning}
                >
                  {assigning ? "Assigning…" : `Assign ${selected.size || ""} selected`.trim()}
                </button>
              </>
            )}
          </div>

          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                marginBottom: 10,
              }}
            >
              Add a new player
            </div>
            <form onSubmit={handleCreateAndAdd} style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Player name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  fontSize: 14,
                  background: "var(--bg)",
                  color: "var(--ink)",
                }}
              />
              <button type="submit" className="btn" disabled={creating}>
                {creating ? "Adding…" : "Add"}
              </button>
            </form>
          </div>
        </>
      )}

      {error && <div className="error-text">{error}</div>}
      {!editable && (
        <p style={{ color: "var(--ink-muted)", fontSize: 13, marginTop: 4 }}>
          Players can only be assigned while the tournament is in draft, before round 1 starts.
        </p>
      )}
    </div>
  );
}
