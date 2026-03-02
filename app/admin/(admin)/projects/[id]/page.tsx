import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { type Project } from "@/lib/db/schema";
import L from "@/lib/labels";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createAdminClient();

  const { data: raw } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!raw) notFound();

  // Supabase returns snake_case; map to the camelCase Project type
  const project = {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    bannerUrl: raw.banner_url ?? null,
    status: raw.status,
    startDate: raw.start_date ?? null,
    endDate: raw.end_date ?? null,
    completionBonusPoints: raw.completion_bonus_points ?? 0,
    createdBy: raw.created_by ?? null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  } as unknown as Project;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/projects" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" /> {L.admin.projects.backLink}
        </Link>
        <h1 className="text-2xl font-bold">{L.admin.projects.editTitle}</h1>
      </div>
      <ProjectForm project={project} />
    </div>
  );
}
