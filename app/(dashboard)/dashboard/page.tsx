import { auth } from "@/auth";
import { getProjectsForRole, getViewableParamsForRole } from "@/lib/project-service";
import { getRole } from "@/lib/auth";
import Link from "next/link";

const DASHBOARD_PROJECT_LIMIT = 50;
const PAGINATION_KEYS = new Set(["page", "limit"]);

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseFilters(
  params: Record<string, string | string[] | undefined>,
  allowedFilterKeys: Set<string>
): Record<string, string> {
  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (PAGINATION_KEYS.has(key) || !allowedFilterKeys.has(key)) continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (typeof v === "string" && v.trim() !== "") filters[key] = v.trim();
  }
  return filters;
}

function buildFilteredProjectsUrl(filters: Record<string, string>): string {
  if (Object.keys(filters).length === 0) return "/projects";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v.trim() !== "") params.set(k, v.trim());
  }
  return `/projects?${params.toString()}`;
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user) return null;
  const role = getRole(session);
  if (!role) return null;

  const viewableParams = await getViewableParamsForRole(role).catch(() => []);
  const allowedFilterKeys = new Set<string>(["status", ...viewableParams.map((p) => p.key)]);
  const params = await searchParams;
  const filters = parseFilters(params ?? {}, allowedFilterKeys);

  let projects: Awaited<ReturnType<typeof getProjectsForRole>> = [];
  try {
    projects = await getProjectsForRole(role, {
      filters,
      allowedFilterKeys,
      limit: DASHBOARD_PROJECT_LIMIT,
    });
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

  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Dashboard</h1>
      {hasFilters && (
        <p className="mb-4 text-sm text-zinc-600">
          Showing filtered view.{" "}
          <Link href={buildFilteredProjectsUrl(filters)} className="text-blue-600 hover:underline">
            View filtered projects
          </Link>
        </p>
      )}
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
        {projectList.length > 10 ? (
          <div className="px-4 py-2 text-center text-sm text-zinc-500">
            <Link
              href={hasFilters ? buildFilteredProjectsUrl(filters) : "/projects"}
              className="text-blue-600 hover:underline"
            >
              View all projects
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
