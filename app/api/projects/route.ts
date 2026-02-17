import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRole } from "@/lib/auth";
import {
  getProjectsForRole,
  getProjectsCountForRole,
  getViewableParamsForRole,
  createProject,
} from "@/lib/project-service";

const PAGINATION_KEYS = new Set(["page", "limit"]);

function parseFilters(
  searchParams: URLSearchParams,
  allowedFilterKeys: Set<string>
): Record<string, string> {
  const filters: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (PAGINATION_KEYS.has(key) || !allowedFilterKeys.has(key)) continue;
    const v = value?.trim();
    if (v !== "") filters[key] = v;
  }
  return filters;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = getRole(session);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const viewableParams = await getViewableParamsForRole(role).catch(() => []);
  const allowedFilterKeys = new Set<string>(["status", ...viewableParams.map((p) => p.key)]);

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limitParam = searchParams.get("limit");
  const limit = limitParam
    ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 10))
    : 10;
  const filters = parseFilters(searchParams, allowedFilterKeys);

  const [projects, total] = await Promise.all([
    getProjectsForRole(role, { page, limit, filters, allowedFilterKeys }),
    getProjectsCountForRole(role, { filters, allowedFilterKeys }),
  ]);
  const totalPages = Math.ceil(total / limit);
  return NextResponse.json({
    projects,
    total,
    page,
    limit,
    totalPages,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = getRole(session);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  try {
    const project = await createProject(body, session.user.id, role);
    return NextResponse.json(project);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create project" },
      { status: 400 }
    );
  }
}
