import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !canAccessAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const entity = searchParams.get("entity");
  const actorId = searchParams.get("actorId");
  const where: { entityId?: string; entity?: string; actorId?: string } = {};
  if (projectId) where.entityId = projectId;
  if (entity) where.entity = entity;
  if (actorId) where.actorId = actorId;
  const logs = await prisma.auditLog.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      actor: { select: { id: true, email: true, name: true } },
    },
  });
  return NextResponse.json(logs);
}
