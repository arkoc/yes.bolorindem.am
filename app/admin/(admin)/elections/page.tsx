import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import L from "@/lib/labels";
import { formatAMD } from "@/lib/elections-config";
import { ElectionStatusSelect } from "@/components/elections/ElectionStatusSelect";

type Registration = {
  id: string;
  type: string;
  full_name: string;
  phone: string | null;
  payment_status: string;
  payment_amount: number;
  status: string;
  created_at: string;
};

export default async function AdminElectionsPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("election_registrations")
    .select("id, type, full_name, phone, payment_status, payment_amount, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const registrations = (data ?? []) as Registration[];
  const voterCount = registrations.filter((r) => r.type === "voter").length;
  const candidateCount = registrations.filter((r) => r.type === "candidate").length;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold">{L.elections.adminTitle}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {voterCount} {L.elections.goalVoterLabel} · {candidateCount} {L.elections.goalCandidateLabel}
        </p>
      </div>

      {registrations.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Արձanagrum չka
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {registrations.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm">{r.full_name}</span>
                      <Badge variant={r.type === "candidate" ? "warning" : "outline"} className="text-xs">
                        {r.type === "voter" ? L.elections.adminTypeVoter : L.elections.adminTypeCandidate}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      {r.phone && <span>{r.phone}</span>}
                      <span>{formatAMD(r.payment_amount)}</span>
                      <span>{new Date(r.created_at).toLocaleDateString("hy-AM")}</span>
                      <span className="font-mono opacity-50">#{r.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ElectionStatusSelect id={r.id} field="payment_status" value={r.payment_status} />
                    <ElectionStatusSelect id={r.id} field="status" value={r.status} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
