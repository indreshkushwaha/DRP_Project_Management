import { auth } from "@/auth";
import { getProjectsForRole } from "@/lib/project-service";
import { getRole } from "@/lib/auth";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;
  const role = getRole(session);
  if (!role) return null;
  let projects: Awaited<ReturnType<typeof getProjectsForRole>>;
  try {
    projects = await getProjectsForRole(role);
  } catch {
    projects = [];
  }
  const projectList = Array.isArray(projects) ? projects : [];

  const byStatus = projectList.reduce(
    (acc, p) => {
      const s = String((p as { status?: string }).status ?? "pending");
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Dashboard</h1>
      <div className="mb-8 flex gap-4">
        {Object.entries(byStatus).map(([status, count]) => (
          <div
            key={status}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-sm text-zinc-500">{status}</p>
            <p className="text-2xl font-semibold text-zinc-900">{count}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="font-medium text-zinc-900">Recent projects</h2>
        </div>
        <ul className="divide-y divide-zinc-200">
          {projectList.slice(0, 10).map((p) => (
            <li key={(p as { id: string }).id}>
              <Link
                href={`/projects/${(p as { id: string }).id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
              >
                <span className="font-medium text-zinc-900">{(p as { name?: string }).name}</span>
                <span className="text-sm text-zinc-500">{(p as { status?: string }).status}</span>
              </Link>
            </li>
          ))}
        </ul>
        {projectList.length > 10 && (
          <div className="px-4 py-2 text-center text-sm text-zinc-500">
            <Link href="/projects" className="text-blue-600 hover:underline">
              View all projects
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
