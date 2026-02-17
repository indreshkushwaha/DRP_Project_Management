import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canSeeConfidential } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !canSeeConfidential(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, confidentialNotes: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json({ confidentialNotes: project.confidentialNotes ?? "" });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !canSeeConfidential(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const confidentialNotes = typeof body.confidentialNotes === "string" ? body.confidentialNotes : "";
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  await prisma.project.update({
    where: { id },
    data: { confidentialNotes },
  });
  await logAudit({
    actorId: session.user.id,
    entity: "project",
    entityId: id,
    action: "update",
    fieldName: "confidentialNotes",
    oldValue: project.confidentialNotes ?? "",
    newValue: confidentialNotes,
  });
  return NextResponse.json({ confidentialNotes });
}
