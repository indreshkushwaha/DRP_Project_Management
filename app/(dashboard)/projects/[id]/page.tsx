import { auth } from "@/auth";
import { getRole, canSeeConfidential } from "@/lib/auth";
import { getProjectByIdForRole } from "@/lib/project-service";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProjectDetailClient } from "./project-detail-client";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;
  const role = getRole(session);
  if (!role) return null;
  const project = await getProjectByIdForRole(id, role, canSeeConfidential(session));
  if (!project) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/projects" className="text-sm text-zinc-500 hover:text-zinc-700">
          ← Projects
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">
        {(project as { name?: string }).name}
      </h1>
      <ProjectDetailClient
        projectId={id}
        initialProject={project}
        role={role}
        canSeeConfidential={canSeeConfidential(session)}
      />
    </div>
  );
}
