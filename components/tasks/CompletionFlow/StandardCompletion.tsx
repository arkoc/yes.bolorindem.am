"use client";

import L, { t } from "@/lib/labels";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, Zap, RefreshCw } from "lucide-react";

interface StandardCompletionProps {
  taskId: string;
  projectId: string;
  taskTitle: string;
  points: number;
  isDone: boolean;
  isRepeatable: boolean;
  userCompletions: number;
  maxCompletions: number;
  allowBatchSubmission?: boolean;
}

export function StandardCompletion({
  taskId,
  projectId,
  points,
  isDone,
  isRepeatable,
  userCompletions,
  maxCompletions,
  allowBatchSubmission = false,
}: StandardCompletionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [awardedPoints, setAwardedPoints] = useState(0);
  const [batchCount, setBatchCount] = useState(1);

  async function handleComplete() {
    setLoading(true);
    try {
      const count = allowBatchSubmission ? batchCount : 1;
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskType: "standard", count }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to complete task.");
        return;
      }

      setAwardedPoints(data.completion.points_awarded);
      setJustCompleted(true);
      toast.success(t(L.completion.standard.toastSuccess, { points: data.completion.points_awarded }));
      router.refresh();
    } catch {
      toast.error(L.completion.standard.toastNetworkError);
    } finally {
      setLoading(false);
    }
  }

  if (justCompleted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-8 text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-green-800 text-lg">{L.completion.standard.successTitle}</h3>
            <p className="text-green-700 flex items-center justify-center gap-1 mt-1">
              <Zap className="h-4 w-4" />
              {t(L.completion.standard.successPoints, { points: awardedPoints })}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push(`/projects/${projectId}`)} className="mt-2">
            {L.completion.standard.backToProject}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isDone && !isRepeatable) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-6 text-center">
          <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-green-700">{L.completion.standard.alreadyDoneTitle}</p>
          <p className="text-sm text-green-600 mt-1">{L.completion.standard.alreadyDoneText}</p>
        </CardContent>
      </Card>
    );
  }

  if (isDone && isRepeatable) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-6 text-center">
          <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-green-700">{t(L.completion.standard.allDoneTitle, { max: maxCompletions })}</p>
          <p className="text-sm text-green-600 mt-1">{L.completion.standard.allDoneText}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6 space-y-4">
        <p className="text-muted-foreground text-sm text-center">
          {isRepeatable
            ? t(L.completion.standard.progressText, { count: userCompletions, max: maxCompletions })
            : L.completion.standard.progressTextOnce}
        </p>
        {allowBatchSubmission && (
          <div className="space-y-1.5">
            <Label htmlFor="batch_count">{L.completion.standard.batchLabel}</Label>
            <Input
              id="batch_count"
              type="number"
              min="1"
              max={maxCompletions - userCompletions}
              value={batchCount}
              onChange={(e) => setBatchCount(Math.min(maxCompletions - userCompletions, Math.max(1, parseInt(e.target.value) || 1)))}
              className="text-center text-lg font-semibold"
            />
          </div>
        )}
        <Button
          onClick={handleComplete}
          disabled={loading}
          className="w-full h-12 text-base"
          size="lg"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              {isRepeatable ? <RefreshCw className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
              {allowBatchSubmission && batchCount > 1
                ? t(L.completion.standard.completeBatchBtn, { count: batchCount, points: points * batchCount })
                : t(L.completion.standard.completeBtn, { points })}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
