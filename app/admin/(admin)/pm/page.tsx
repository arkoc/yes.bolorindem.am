"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PM_NOMINATION_THRESHOLD } from "@/lib/elections-config";
import { Trash2, ChevronDown, Ban, RotateCcw, ArrowUpRight } from "lucide-react";

interface Nominator {
  id: string;
  user_id: string;
  nominee_name: string;
  nominator_email: string | null;
  created_at: string;
  profile_name: string;
  banned: boolean;
  ban_reason: string | null;
}

interface NomineeGroup {
  name: string;
  nominations: Nominator[];
  count: number;
  isOfficial: boolean;
}

export default function AdminPmPage() {
  const [nominees, setNominees] = useState<NomineeGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchNominations();
  }, []);

  const fetchNominations = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/pm/nominations");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch");
      }
      const data = await res.json();
      console.log("Nominations data:", data);

      // Group by nominee_name
      const grouped = new Map<string, Nominator[]>();
      data.forEach((nom: Nominator) => {
        if (!grouped.has(nom.nominee_name)) {
          grouped.set(nom.nominee_name, []);
        }
        grouped.get(nom.nominee_name)!.push(nom);
      });

      const groups = Array.from(grouped).map(([name, noms]) => ({
        name,
        nominations: noms,
        count: noms.length,
        isOfficial: noms.length >= PM_NOMINATION_THRESHOLD,
      }));

      groups.sort((a, b) => b.count - a.count);
      setNominees(groups);
    } catch (error) {
      console.error("Error fetching nominations:", error);
      toast.error("Չհաջողվեց բեռնել թեկնածուներ. Ստուգեք կոնսոլը:");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGroup = (name: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedGroups(newExpanded);
  };

  const handleDeleteNomination = async (id: string, nomineeName: string) => {
    if (!confirm(`Հեռացնե՞լ ${nomineeName}-ի առաջադրությունը`)) return;

    try {
      const res = await fetch(`/api/admin/pm/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Առաջադրությունը հեռացվել է");
      await fetchNominations();
    } catch (error) {
      console.error("Error deleting nomination:", error);
      toast.error("Չհաջողվեց հեռացնել");
    }
  };

  const handleBanUser = async (userId: string, userName: string, isBanned: boolean) => {
    const action = isBanned ? "ապաբաժանել" : "բաժանել";
    const reason = isBanned ? null : prompt(`Ինչու ենք բաժանում ${userName}-ին?`);

    if (!isBanned && !reason) return; // User cancelled

    try {
      const endpoint = isBanned
        ? `/api/admin/pm/ban/${userId}`
        : `/api/admin/pm/ban/${userId}`;

      const method = isBanned ? "DELETE" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: !isBanned ? JSON.stringify({ reason }) : undefined,
      });

      if (!res.ok) throw new Error("Failed to ban/unban");
      toast.success(`${userName}-ը ${action}ված է`);
      await fetchNominations();
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error("Չհաջողվեց բաժանել/ապաբաժանել");
    }
  };

  const exportCSV = () => {
    const rows = [["Թեկնածուի անուն", "Առաջադրությունների քանակ", "Առաջադրածի անուն", "Ամսաթիվ"]];
    nominees.forEach((group) => {
      group.nominations.forEach((nom, idx) => {
        rows.push([
          idx === 0 ? group.name : "",
          idx === 0 ? group.count.toString() : "",
          nom.profile_name,
          new Date(nom.created_at).toLocaleDateString("hy-AM"),
        ]);
      });
    });

    const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pm-nominations-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = nominees.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalNominations = nominees.reduce((sum, g) => sum + g.count, 0);
  const officialCount = nominees.filter((g) => g.isOfficial).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Բեռնվում է...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Վարչապետի թեկնածուներ</h1>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground">{totalNominations}</span> ընդամենը
            </div>
            <div>
              <span className="font-semibold text-foreground">{officialCount}</span> թեկնածու
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Input
            placeholder="Որոնել անունով..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button onClick={exportCSV} variant="outline">
            Ներբեռնել CSV
          </Button>
        </div>

        {/* Nominees List */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Արդյունք չեն գտնվել
            </div>
          ) : (
            filtered.map((group) => (
              <div key={group.name} className="border rounded-lg overflow-hidden">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.name)}
                  className="w-full flex items-center justify-between bg-card hover:bg-muted/50 p-4 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        expandedGroups.has(group.name) ? "rotate-180" : ""
                      }`}
                    />
                    <div>
                      <p className="font-semibold">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.count} առաջադրություններ
                      </p>
                    </div>
                  </div>
                  {group.isOfficial && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-600 text-white text-xs font-semibold px-3 py-1">
                      ✓ Թեկնածու է
                    </span>
                  )}
                </button>

                {/* Expanded details */}
                {expandedGroups.has(group.name) && (
                  <div className="border-t bg-muted/30 divide-y">
                    {group.nominations.map((nom) => (
                      <div
                        key={nom.id}
                        className="flex items-center justify-between p-3 text-sm"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/profile/${nom.user_id}`}
                              className="font-medium hover:text-primary transition-colors inline-flex items-center gap-1"
                            >
                              {nom.profile_name || "Unknown User"}
                              <ArrowUpRight className="h-3 w-3 opacity-50 shrink-0" />
                            </Link>
                            {nom.banned && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 shrink-0">
                                Արգելափակ
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(nom.created_at).toLocaleDateString("hy-AM")} ·{" "}
                            {new Date(nom.created_at).toLocaleTimeString("hy-AM", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {nom.ban_reason && (
                            <p className="text-xs text-red-600 mt-1">Պատճառ: {nom.ban_reason}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={nom.banned ? "outline" : "ghost"}
                            onClick={() => handleBanUser(nom.user_id, nom.profile_name, nom.banned)}
                            className={nom.banned ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-red-600 hover:text-red-700 hover:bg-red-50"}
                          >
                            {nom.banned ? (
                              <RotateCcw className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteNomination(nom.id, group.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
