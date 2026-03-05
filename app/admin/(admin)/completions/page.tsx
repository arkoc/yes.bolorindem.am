import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReverseButton } from "@/components/admin/ReverseButton";
import { CompletionsFilter } from "@/components/admin/CompletionsFilter";
import { CheckCircle, XCircle } from "lucide-react";
import { Suspense } from "react";
import L, { t } from "@/lib/labels";

type CompletionItem = {
  id: string;
  points_awarded: number;
  status: string;
  completed_at: string;
  completion_number: number;
  form_data: Record<string, unknown> | null;
  location_data: { lat: number; lng: number } | null;
  evidence_urls: string[] | null;
  profiles: { full_name: string } | null;
  tasks: { title: string; project_id: string; projects: { title: string } | null } | null;
};

export default async function AdminCompletionsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; user?: string }>;
}) {
  const { project: projectId, user: userId } = await searchParams;
  const supabase = createAdminClient();

  const [completionsRes, projectsRes, usersRes] = await Promise.all([
    (() => {
      let q = supabase
        .from("task_completions")
        .select("id, points_awarded, status, completed_at, completion_number, form_data, location_data, evidence_urls, profiles!task_completions_user_id_fkey(full_name), tasks(title, project_id, projects(title))")
        .order("completed_at", { ascending: false })
        .limit(200);
      if (userId) q = q.eq("user_id", userId);
      return q;
    })(),
    supabase.from("projects").select("id, title").order("title"),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]);

  let completions = (completionsRes.data ?? []) as unknown as CompletionItem[];
  if (projectId) {
    completions = completions.filter((c) => c.tasks?.project_id === projectId);
  }

  const projects = (projectsRes.data ?? []) as { id: string; title: string }[];
  const users = (usersRes.data ?? []) as { id: string; full_name: string }[];

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{L.admin.completions.title}</h1>
          <p className="text-muted-foreground text-sm">
            {completions.length !== 1 ? t(L.admin.completions.recordCountPlural, { count: completions.length }) : t(L.admin.completions.recordCount, { count: completions.length })}
            {projectId || userId ? " " + L.admin.completions.filtered : ""}
          </p>
        </div>
        <Suspense>
          <CompletionsFilter
            projects={projects}
            users={users}
            selectedProjectId={projectId ?? ""}
            selectedUserId={userId ?? ""}
          />
        </Suspense>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {completions.length > 0 ? (
              completions.map((c) => (
                <div key={c.id} className="px-3 md:px-5 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {c.status === "approved" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{c.profiles?.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.tasks?.title}{" · "}{c.tasks?.projects?.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant={c.status === "approved" ? "success" : "destructive"} className="text-xs">
                            {c.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(c.completed_at).toLocaleString()}
                          </span>
                          {c.completion_number > 1 && (
                            <span className="text-xs text-muted-foreground">
                              {t(L.admin.completions.completionNumber, { number: c.completion_number })}
                            </span>
                          )}
                        </div>

                        {c.form_data && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              {L.admin.completions.formData}
                            </summary>
                            <pre className="mt-1 text-[10px] md:text-xs bg-muted p-2 rounded overflow-x-auto max-w-[calc(100vw-6rem)] md:max-w-sm">
                              {JSON.stringify(c.form_data, null, 2)}
                            </pre>
                          </details>
                        )}

                        {c.location_data && (
                          <a
                            href={`https://yandex.com/maps/?pt=${c.location_data.lng},${c.location_data.lat}&z=16`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 text-xs text-primary hover:underline inline-flex items-center gap-1"
                          >
                            📍 {c.location_data.lat.toFixed(5)}, {c.location_data.lng.toFixed(5)}
                          </a>
                        )}

                        {c.evidence_urls && c.evidence_urls.length > 0 && (
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {c.evidence_urls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`Evidence ${i + 1}`}
                                  className="h-16 w-16 object-cover rounded border hover:opacity-80 transition-opacity"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <p className={`text-sm font-semibold ${c.status === "approved" ? "text-green-600" : "text-red-500 line-through"}`}>
                        +{c.points_awarded} pts
                      </p>
                      {c.status === "approved" && (
                        <ReverseButton completionId={c.id} points={c.points_awarded} />
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-muted-foreground text-sm">
                {L.admin.completions.emptyText}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
