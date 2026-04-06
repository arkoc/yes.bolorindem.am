import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import L from "@/lib/labels";
import { formatAMD } from "@/lib/elections-config";
import { ApprovePaymentButton } from "@/components/elections/ApprovePaymentButton";
import { RejectRegistrationButton } from "@/components/elections/RejectRegistrationButton";

export const dynamic = "force-dynamic";

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

export default async function AdminElectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("election_registrations")
    .select("id, type, full_name, phone, payment_status, payment_amount, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const all = (data ?? []) as Registration[];

  const pending = all.filter((r) => r.payment_status === "pending" && r.status !== "rejected");
  const paid = all.filter((r) => r.payment_status === "paid");

  const candidates = all.filter((r) => r.type === "candidate");
  const displayed =
    filter === "pending"   ? pending   :
    filter === "paid"      ? paid      :
    filter === "candidate" ? candidates :
    all;

  const tabs = [
    { key: undefined,     label: "Բոլորը",       count: all.length },
    { key: "pending",     label: "Սպասում է",     count: pending.length },
    { key: "paid",        label: "Վճարված",       count: paid.length },
    { key: "candidate",   label: "Թեկնածուներ",   count: candidates.length },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold">{L.elections.adminTitle}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {all.filter((r) => r.type === "voter").length} {L.elections.goalVoterLabel} ·{" "}
          {all.filter((r) => r.type === "candidate").length} {L.elections.goalCandidateLabel}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => {
          const href = tab.key ? `/admin/elections?filter=${tab.key}` : "/admin/elections";
          const active = (filter ?? undefined) === tab.key;
          return (
            <a
              key={tab.label}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-70">{tab.count}</span>
            </a>
          );
        })}
      </div>

      {displayed.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Արձanagrum չka
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {displayed.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm">{r.full_name}</span>
                      <Badge variant={r.type === "candidate" ? "warning" : "outline"} className="text-xs">
                        {r.type === "voter" ? L.elections.adminTypeVoter : L.elections.adminTypeCandidate}
                      </Badge>
                      {r.payment_status === "paid" && (
                        <Badge variant="success" className="text-xs">Վճարված</Badge>
                      )}
                      {r.payment_status === "pending" && (
                        <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">Սպ. վճար.</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      {r.phone && <span>{r.phone}</span>}
                      <span>{formatAMD(r.payment_amount)}</span>
                      <span>{new Date(r.created_at).toLocaleDateString("hy-AM")}</span>
                      <span className="font-mono opacity-50">#{r.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.payment_status === "pending" && (
                      <ApprovePaymentButton id={r.id} />
                    )}
                    <RejectRegistrationButton id={r.id} />
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
