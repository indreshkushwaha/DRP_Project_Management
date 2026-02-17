import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRole, canSeeConfidential } from "@/lib/auth";
import { getProjectByIdForRole, updateProject } from "@/lib/project-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = getRole(session);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const project = await getProjectByIdForRole(id, role, canSeeConfidential(session));
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = getRole(session);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const updated = await updateProject(id, body, session.user.id, role);
  if (!updated) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const includeConfidential = canSeeConfidential(session);
  const out = await getProjectByIdForRole(id, role, includeConfidential);
  return NextResponse.json(out);
}
