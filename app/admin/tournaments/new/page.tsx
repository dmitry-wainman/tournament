"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewTournamentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Enter a tournament name.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong creating the tournament.");
      }

      const { tournament } = await res.json();
      router.push(`/admin/tournaments/${tournament.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>New tournament</h1>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Tournament name</label>
          <input
            id="name"
            type="text"
            placeholder="e.g. Summer League 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          {error && <div className="error-text">{error}</div>}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? "Creating…" : "Create tournament"}
          </button>
          <Link href="/admin/tournaments" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
