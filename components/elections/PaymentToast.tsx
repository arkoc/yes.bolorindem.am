"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function PaymentToast({ status }: { status?: string }) {
  useEffect(() => {
    if (status === "success") {
      toast.success("Վճարումն ընդունված է։ Գրանցումը հաջողությամբ ավարտված է։");
    } else if (status === "failed") {
      toast.error("Վճարումը չի կատարվել։ Կրկին փորձեք։");
    } else if (status === "error") {
      toast.error("Վճարման ստուգման ժամանակ սխալ է տեղի ունեցել։");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
