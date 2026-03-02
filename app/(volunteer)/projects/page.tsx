import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderOpen, Calendar, ArrowRight, Star } from "lucide-react";
import { formatPoints } from "@/lib/utils";
import L, { t } from "@/lib/labels";

export default async function ProjectsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, description, banner_url, status, start_date, end_date, completion_bonus_points, tasks(count)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">{L.volunteer.projects.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {L.volunteer.projects.subtitle}
        </p>
      </div>

      {projects && projects.length > 0 ? (
        <div className="space-y-3">
          {projects.map((project: {
            id: string;
            title: string;
            description: string | null;
            banner_url: string | null;
            status: string;
            start_date: string | null;
            end_date: string | null;
            completion_bonus_points: number;
            tasks: { count: number }[];
          }) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
                {project.banner_url && (
                  <div className="h-32 w-full overflow-hidden rounded-t-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={project.banner_url}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{project.title}</CardTitle>
                    {project.completion_bonus_points > 0 && (
                      <Badge variant="success" className="shrink-0 text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        {formatPoints(project.completion_bonus_points)} bonus
                      </Badge>
                    )}
                  </div>
                  {project.description && (
                    <CardDescription className="text-sm line-clamp-2">
                      {project.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <FolderOpen className="h-3.5 w-3.5" />
                        {t(L.volunteer.projects.taskCount, { count: project.tasks?.[0]?.count ?? 0 })}
                      </span>
                      {(project.start_date || project.end_date) && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {project.start_date && project.end_date
                            ? `${new Date(project.start_date).toLocaleDateString()} – ${new Date(project.end_date).toLocaleDateString()}`
                            : project.start_date
                            ? t(L.volunteer.projects.dateFrom, { date: new Date(project.start_date).toLocaleDateString() })
                            : t(L.volunteer.projects.dateUntil, { date: new Date(project.end_date!).toLocaleDateString() })}
                        </span>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">{L.volunteer.projects.emptyTitle}</h3>
            <p className="text-sm text-muted-foreground">
              {L.volunteer.projects.emptyText}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
