import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile.role !== "admin" && profile.role !== "leader")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "voter" | "candidate" | null (all)

  const adminClient = createAdminClient();
  let query = adminClient
    .from("election_registrations")
    .select("type, full_name, patronymic, phone, document_number, passport_number, payment_amount, payment_status, status, created_at")
    .order("created_at", { ascending: true });

  if (type === "voter" || type === "candidate") query = query.eq("type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const headers = ["Տեսակ", "Անուն Ազգանուն", "Հայրանուն", "Հեռախոս", "ՀԾՀ", "Անձնագիր", "Վճար", "Վճ. կարգ.", "Կարգ.", "Ամսաթիվ"];
  const escape = (v: string | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const lines = [
    headers.join(","),
    ...rows.map((r) => [
      escape(r.type === "candidate" ? "Թեկնածու" : "Ընտրող"),
      escape(r.full_name),
      escape(r.patronymic),
      escape(r.phone),
      escape(r.document_number),
      escape(r.passport_number),
      escape(String(r.payment_amount)),
      escape(r.payment_status),
      escape(r.status),
      escape(new Date(r.created_at).toLocaleDateString("hy-AM")),
    ].join(",")),
  ];

  const csv = "\uFEFF" + lines.join("\r\n"); // BOM for Excel Armenian text
  const filename = `elections-${type ?? "all"}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
