import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRole } from "@/lib/auth";
import { getProjectsForRole, createProject } from "@/lib/project-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = getRole(session);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const projects = await getProjectsForRole(role);
  return NextResponse.json(projects);
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
