import { auth } from "@/auth";
import { getProjectsForRole } from "@/lib/project-service";
import { getRole } from "@/lib/auth";
import Link from "next/link";

export default async function ProjectsPage() {
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Projects</h1>
        <Link
          href="/projects/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New project
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {projectList.map((p) => (
              <tr key={(p as { id: string }).id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/projects/${(p as { id: string }).id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {(p as { name?: string }).name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">{(p as { status?: string }).status}</td>
                <td className="px-4 py-3 text-right text-sm text-zinc-500">
                  {new Date((p as { updatedAt?: string }).updatedAt ?? "").toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {projectList.length === 0 && (
          <p className="px-4 py-8 text-center text-zinc-500">No projects yet.</p>
        )}
      </div>
    </div>
  );
}
