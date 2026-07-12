import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <Link href="/admin/tournaments" className="topbar-title">
            Tournament Admin
          </Link>
          <nav className="topbar-nav">
            <Link href="/admin/tournaments">Tournaments</Link>
            <LogoutButton />
          </nav>
        </div>
      </div>
      <div className="shell">{children}</div>
    </>
  );
}
