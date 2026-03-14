import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus, ArrowRight, Star, ClipboardList, Pencil, MapPin } from "lucide-react";
import { formatPoints } from "@/lib/utils";
import L, { t } from "@/lib/labels";

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive" | "success" | "warning"> = {
  draft: "secondary",
  active: "success",
  completed: "outline",
  archived: "destructive",
};

export default async function AdminProjectsPage() {
  const supabase = createAdminClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status, completion_bonus_points, project_type, created_at, tasks(count)")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{L.admin.projects.title}</h1>
          <p className="text-muted-foreground text-sm">{L.admin.projects.subtitle}</p>
        </div>
        <Button asChild>
          <Link href="/admin/projects/new">
            <Plus className="h-4 w-4" /> {L.admin.projects.newProject}
          </Link>
        </Button>
      </div>

      {projects && projects.length > 0 ? (
        <div className="space-y-2">
          {projects.map((p: {
            id: string;
            title: string;
            status: string;
            completion_bonus_points: number;
            project_type: string;
            created_at: string;
            tasks: { count: number }[];
          }) => (
            <Card key={p.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <FolderOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{p.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant={statusVariant[p.status] ?? "outline"} className="text-xs capitalize">
                        {p.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {t(L.admin.projects.taskCount, { count: p.tasks?.[0]?.count ?? 0 })}
                      </span>
                      {p.completion_bonus_points > 0 && (
                        <span className="text-xs text-green-600 flex items-center gap-0.5">
                          <Star className="h-3 w-3" />
                          {formatPoints(p.completion_bonus_points)} bonus
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Desktop action buttons */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    {p.project_type !== "heatmap" && (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/completions?project=${p.id}`}>
                          <ClipboardList className="h-3.5 w-3.5" />
                          {L.admin.projects.completions}
                        </Link>
                      </Button>
                    )}
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admin/projects/${p.id}`}>
                        {L.admin.projects.edit}
                      </Link>
                    </Button>
                    {p.project_type === "heatmap" ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/heatmap/${p.id}`}>
                          <MapPin className="h-3 w-3 mr-1" /> Heatmap <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/projects/${p.id}/tasks`}>
                          {L.admin.projects.tasks} <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                  {/* Mobile icon-only buttons */}
                  <div className="flex sm:hidden items-center gap-1 shrink-0">
                    {p.project_type !== "heatmap" && (
                      <Button asChild size="icon" variant="ghost" className="h-9 w-9">
                        <Link href={`/admin/completions?project=${p.id}`} aria-label={L.admin.projects.completions}>
                          <ClipboardList className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    <Button asChild size="icon" variant="ghost" className="h-9 w-9">
                      <Link href={`/admin/projects/${p.id}`} aria-label={L.admin.projects.edit}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="icon" variant="outline" className="h-9 w-9">
                      <Link href={p.project_type === "heatmap" ? `/admin/heatmap/${p.id}` : `/admin/projects/${p.id}/tasks`} aria-label={p.project_type === "heatmap" ? "Heatmap" : L.admin.projects.tasks}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">{L.admin.projects.emptyTitle}</h3>
            <Button asChild>
              <Link href="/admin/projects/new">
                <Plus className="h-4 w-4" /> {L.admin.projects.createFirst}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
