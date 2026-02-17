import { auth } from "@/auth";
import { getProjectsForRole, getProjectsCountForRole, getViewableParamsForRole, getDashboardColumnKeys } from "@/lib/project-service";
import { getRole } from "@/lib/auth";
import Link from "next/link";
import { ProjectsTableClient } from "./projects-table-client";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
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

export default async function ProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = getRole(session);
  if (!role) return null;

  const [viewableResult, columnPrefResult] = await Promise.allSettled([
    getViewableParamsForRole(role),
    getDashboardColumnKeys(session.user.id),
  ]);
  const viewableParams: Awaited<ReturnType<typeof getViewableParamsForRole>> =
    viewableResult.status === "fulfilled" ? viewableResult.value : [];
  const columnPref: string[] = columnPrefResult.status === "fulfilled" ? columnPrefResult.value : [];
  if (viewableResult.status === "rejected") console.error("Failed to load viewable params:", viewableResult.reason);
  if (columnPrefResult.status === "rejected") console.error("Failed to load dashboard column preference:", columnPrefResult.reason);

  const allowedFilterKeys = new Set<string>(["status", ...viewableParams.map((p) => p.key)]);
  const params = await searchParams;
  const page = Math.max(1, parseInt(String(params?.page ?? ""), 10) || DEFAULT_PAGE);
  const limit = Math.min(100, Math.max(1, parseInt(String(params?.limit ?? ""), 10) || DEFAULT_LIMIT));
  const filters = parseFilters(params ?? {}, allowedFilterKeys);

  let projects: Awaited<ReturnType<typeof getProjectsForRole>> = [];
  let total = 0;
  try {
    [projects, total] = await Promise.all([
      getProjectsForRole(role, { page, limit, filters, allowedFilterKeys }),
      getProjectsCountForRole(role, { filters, allowedFilterKeys }),
    ]);
  } catch (e) {
    console.error("Failed to load projects:", e);
  }

  const projectList = Array.isArray(projects) ? projects : [];
  const totalPages = Math.ceil(total / limit);
  const columnsToShow =
    columnPref.length > 0
      ? columnPref
          .map((key) => viewableParams.find((p) => p.key === key))
          .filter(Boolean) as Awaited<ReturnType<typeof getViewableParamsForRole>>
      : viewableParams;

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
      <ProjectsTableClient
        projects={projectList}
        viewableParams={viewableParams}
        columnsToShow={columnsToShow}
        pagination={{
          total,
          page,
          limit,
          totalPages,
        }}
        currentFilters={filters}
        filterableColumns={[{ key: "status", label: "Status" }, ...columnsToShow]}
      />
    </div>
  );
}
