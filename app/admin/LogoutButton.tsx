"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        background: "none",
        border: "none",
        color: "var(--ink-muted)",
        fontSize: 13,
        cursor: "pointer",
        marginLeft: 20,
        padding: 0,
        fontFamily: "var(--font-body)",
      }}
    >
      Log out
    </button>
  );
}
