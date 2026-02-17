import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function MessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;
  const message = await prisma.message.findUnique({
    where: { id },
    include: { sender: { select: { name: true, email: true } } },
  });
  if (!message) notFound();
  return (
    <div>
      <Link href="/inbox" className="text-sm text-zinc-500 hover:text-zinc-700">
        ← Inbox
      </Link>
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900">{message.title}</h1>
          {message.priority === "IMPORTANT" && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-800">
              Important
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500">
          From {message.sender.name ?? message.sender.email} ·{" "}
          {new Date(message.createdAt).toLocaleString()}
        </p>
        <div className="mt-4 whitespace-pre-wrap text-zinc-700">{message.body}</div>
      </div>
    </div>
  );
}
