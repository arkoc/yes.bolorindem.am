import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPoints } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UserRoleSelect } from "@/components/admin/UserRoleSelect";
import { Zap } from "lucide-react";
import L, { t } from "@/lib/labels";

export default async function AdminUsersPage() {
  const supabase = await createAdminClient();

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, phone, total_points, role, created_at")
    .order("total_points", { ascending: false });

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">{L.admin.users.title}</h1>
        <p className="text-muted-foreground text-sm">{t(L.admin.users.subtitle, { count: users?.length ?? 0 })}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {(users ?? []).map((u: {
              id: string;
              full_name: string;
              phone: string | null;
              total_points: number;
              role: string;
              created_at: string;
            }, index: number) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                <span className="text-sm font-semibold text-muted-foreground w-6 text-center shrink-0">
                  {index + 1}
                </span>
                <UserAvatar name={u.full_name} size={40} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground">{u.phone}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-yellow-500" />
                    {formatPoints(u.total_points)}
                  </p>
                </div>
                <div className="shrink-0">
                  <UserRoleSelect userId={u.id} currentRole={u.role} />
                </div>
              </div>
            ))}
            {(!users || users.length === 0) && (
              <div className="py-12 text-center text-muted-foreground text-sm">
                {L.admin.users.empty}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
