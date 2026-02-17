import { auth } from "@/auth";
import { canAccessAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ParametersClient } from "./parameters-client";

export default async function AdminParametersPage() {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session)) redirect("/dashboard");
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Project parameters</h1>
      <ParametersClient />
    </div>
  );
}
