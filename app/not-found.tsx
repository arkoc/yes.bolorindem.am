"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="p-4 rounded-full bg-muted w-fit mx-auto">
          <SearchX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">Էջը չի գտնվել</h1>
        <p className="text-sm text-muted-foreground">Այս հղումը գոյություն չունի կամ հեռացվել է</p>
        <Button className="w-full" onClick={() => router.back()}>
          Վերադառնալ
        </Button>
        <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard")}>
          Գլխավոր էջ
        </Button>
      </div>
    </div>
  );
}
