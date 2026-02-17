import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !canAccessAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const entity = searchParams.get("entity");
  const actorId = searchParams.get("actorId");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const where: { entityId?: string; entity?: string; actorId?: string } = {};
  if (projectId) where.entityId = projectId;
  if (entity) where.entity = entity;
  if (actorId) where.actorId = actorId;
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        actor: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.auditLog.count({ where: Object.keys(where).length ? where : undefined }),
  ]);
  const totalPages = Math.ceil(total / limit);
  return NextResponse.json({ logs, total, page, limit, totalPages });
}
