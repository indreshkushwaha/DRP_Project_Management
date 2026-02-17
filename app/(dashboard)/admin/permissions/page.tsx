import { auth } from "@/auth";
import { canAccessAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PermissionsClient } from "./permissions-client";

export default async function AdminPermissionsPage() {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session)) redirect("/dashboard");
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Field permissions</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Set for each parameter and role: who can view, edit, and update. Admin always has full access.
      </p>
      <PermissionsClient />
    </div>
  );
}
