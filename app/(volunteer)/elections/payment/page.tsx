import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import L from "@/lib/labels";

export default async function ElectionsPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; state?: string }>;
}) {
  const { success, error } = await searchParams;

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">{L.elections.paymentSuccessTitle}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            {L.elections.paymentSuccessBody}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/elections">{L.elections.backToElections}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-6">
      <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
        <XCircle className="h-10 w-10 text-red-600" />
      </div>
      <div>
        <h1 className="text-2xl font-bold mb-2">{L.elections.paymentFailedTitle}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
          {L.elections.paymentFailedBody}
        </p>
        {error && (
          <p className="text-xs text-muted-foreground font-mono mt-2 bg-muted px-3 py-1.5 rounded-lg inline-block">
            {error}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/elections">{L.elections.backToElections}</Link>
        </Button>
        <Button asChild>
          <Link href="/elections">{L.elections.tryAgainBtn}</Link>
        </Button>
      </div>
    </div>
  );
}
