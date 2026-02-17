import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardNav } from "./dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen min-w-0 overflow-x-hidden bg-zinc-50">
      <aside className="shrink-0 w-56 border-r border-zinc-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-zinc-500">Project Manager</h2>
        <DashboardNav role={session.user.role} />
      </aside>
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
