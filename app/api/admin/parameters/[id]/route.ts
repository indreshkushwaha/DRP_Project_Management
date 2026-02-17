import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !canAccessAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const param = await prisma.projectParameter.findUnique({ where: { id } });
  if (!param) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(param);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !canAccessAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { key, label, type, order } = body as { key?: string; label?: string; type?: string; order?: number };
  const existing = await prisma.projectParameter.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: { key?: string; label?: string; type?: string; order?: number } = {};
  if (typeof key === "string" && key.trim()) data.key = key.trim();
  if (typeof label === "string") data.label = label.trim();
  if (typeof type === "string") data.type = type.trim();
  if (typeof order === "number") data.order = order;

  if (data.key && data.key !== existing.key) {
    const conflict = await prisma.projectParameter.findUnique({ where: { key: data.key } });
    if (conflict) return NextResponse.json({ error: "Key already in use." }, { status: 400 });
  }

  const updated = await prisma.projectParameter.update({
    where: { id },
    data,
  });
  if (data.key && data.key !== existing.key) {
    await logAudit({
      actorId: session.user.id,
      entity: "parameter",
      entityId: id,
      action: "update",
      fieldName: "key",
      oldValue: existing.key,
      newValue: data.key,
    });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !canAccessAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.projectParameter.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.projectParameter.delete({ where: { id } });
  await logAudit({
    actorId: session.user.id,
    entity: "parameter",
    entityId: id,
    action: "delete",
    oldValue: JSON.stringify({ key: existing.key }),
  });
  return NextResponse.json({ success: true });
}
