"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const link = (href: string, label: string) => ({ href, label });

export function DashboardNav({ role }: { role: string }) {
  const pathname = usePathname();
  const base = [
    link("/dashboard", "Dashboard"),
    link("/projects", "Projects"),
    link("/inbox", "Inbox"),
    link("/account", "Account"),
  ];
  const admin =
    role === "ADMIN"
      ? [
          link("/admin/users", "Users"),
          link("/admin/parameters", "Parameters"),
          link("/admin/permissions", "Permissions"),
          link("/admin/audit", "Audit log"),
        ]
      : [];
  const nav = [...base, ...admin];

  return (
    <nav className="flex flex-col gap-1">
      {nav.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`rounded px-3 py-2 text-sm font-medium ${
            pathname === href || pathname.startsWith(href + "/")
              ? "bg-blue-50 text-blue-700"
              : "text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          {label}
        </Link>
      ))}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-4 rounded px-3 py-2 text-left text-sm font-medium text-zinc-600 hover:bg-zinc-100"
      >
        Sign out
      </button>
    </nav>
  );
}
