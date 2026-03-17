import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { VolunteerNav } from "@/components/volunteer/VolunteerNav";
import { PullToRefresh } from "@/components/volunteer/PullToRefresh";

export default async function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check profile is set up
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile?.full_name || profile.full_name === "New Volunteer") {
    redirect("/register");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PullToRefresh />
      {/* Main content with bottom padding for nav */}
      <main className="pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-64">
        {children}
      </main>
      {/* Navigation (bottom on mobile, sidebar on desktop) */}
      <VolunteerNav role={profile.role} userId={user.id} />
    </div>
  );
}
