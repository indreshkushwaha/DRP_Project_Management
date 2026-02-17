import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = getRole(session);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (role === "ADMIN") {
    const list = await prisma.projectParameter.findMany({
      orderBy: { order: "asc" },
      select: { id: true, key: true, label: true, type: true, order: true, options: true },
    });
    return NextResponse.json(list);
  }

  const perms = await prisma.fieldPermission.findMany({
    where: { role },
  });
  const viewableParamIds = perms.filter((p) => p.canView).map((p) => p.projectParameterId);
  const list = await prisma.projectParameter.findMany({
    where: { id: { in: viewableParamIds } },
    orderBy: { order: "asc" },
    select: { id: true, key: true, label: true, type: true, order: true, options: true },
  });
  return NextResponse.json(list);
}
