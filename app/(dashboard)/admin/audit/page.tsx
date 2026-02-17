import { auth } from "@/auth";
import { canAccessAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuditClient } from "./audit-client";

export default async function AdminAuditPage() {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session)) redirect("/dashboard");
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Audit log</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Every operation (create, update, delete) is logged here.
      </p>
      <AuditClient />
    </div>
  );
}
