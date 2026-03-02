import { ProjectForm } from "@/components/admin/ProjectForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import L from "@/lib/labels";

export default function NewProjectPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/projects" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" /> {L.admin.projects.backLink}
        </Link>
        <h1 className="text-2xl font-bold">{L.admin.projects.newTitle}</h1>
        <p className="text-muted-foreground text-sm mt-1">{L.admin.projects.newSubtitle}</p>
      </div>
      <ProjectForm />
    </div>
  );
}
