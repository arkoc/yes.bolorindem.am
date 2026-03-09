"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import L, { t } from "@/lib/labels";

interface TaskSuccessScreenProps {
  points: number;
  projectId: string;
}

export function TaskSuccessScreen({ points, projectId }: TaskSuccessScreenProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after mount
    const t = setTimeout(() => setVisible(true), 10);
    // Haptic feedback on supported devices
    if (navigator.vibrate) navigator.vibrate([50, 30, 80]);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center space-y-6 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {/* Animated check ring */}
      <div className="relative">
        <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
          <div className="h-20 w-20 rounded-full bg-green-200 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-full bg-green-300 opacity-30 animate-ping" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-green-800">
          {L.completion.standard.successTitle}
        </h2>
        <div className="flex items-center justify-center gap-2 text-green-700 font-semibold text-lg">
          <Zap className="h-5 w-5 text-yellow-500" />
          <span>+{points} pts</span>
        </div>
        {points > 0 && (
          <p className="text-sm text-muted-foreground">
            {t(L.completion.standard.successPoints, { points })}
          </p>
        )}
      </div>

      <Button
        onClick={() => router.push(`/projects/${projectId}`)}
        className="w-full max-w-xs h-12 text-base gap-2"
      >
        {L.completion.standard.backToProject}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
