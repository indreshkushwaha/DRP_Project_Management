import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !canAccessAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const list = await prisma.projectParameter.findMany({
    orderBy: { order: "asc" },
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !canAccessAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { key, label, type, order, options } = body as {
    key?: string;
    label?: string;
    type?: string;
    order?: number;
    options?: string;
  };
  if (!key?.trim() || !label?.trim()) {
    return NextResponse.json(
      { error: "key and label are required." },
      { status: 400 }
    );
  }
  const keyNorm = String(key).trim();
  const existing = await prisma.projectParameter.findUnique({ where: { key: keyNorm } });
  if (existing) {
    return NextResponse.json({ error: "A parameter with this key already exists." }, { status: 400 });
  }
  const optionsNorm =
    typeof options === "string"
      ? options
          .split(/[,\n]/)
          .map((o) => o.trim())
          .filter(Boolean)
          .join(",")
      : undefined;
  const param = await prisma.projectParameter.create({
    data: {
      key: keyNorm,
      label: String(label).trim(),
      type: type?.trim() || "text",
      order: typeof order === "number" ? order : 0,
      options: optionsNorm ?? undefined,
    },
  });
  await logAudit({
    actorId: session.user.id,
    entity: "parameter",
    entityId: param.id,
    action: "create",
    newValue: JSON.stringify({ key: param.key, label: param.label }),
  });
  return NextResponse.json(param);
}
