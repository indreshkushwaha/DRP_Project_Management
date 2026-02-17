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
    <div className="min-w-0">
      <Link
        href="/projects"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
      >
        ← Back to projects
      </Link>
      <h1 className="mb-8 mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
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
