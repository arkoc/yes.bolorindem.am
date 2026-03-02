"use client";

import L, { t } from "@/lib/labels";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LocationPicker } from "@/components/map/LocationPicker";
import { CheckCircle, MapPin, Zap } from "lucide-react";
import { type TaskLocationData } from "@/lib/db/schema";

interface LocationCompletionProps {
  taskId: string;
  projectId: string;
  points: number;
  locationData: TaskLocationData | null;
  isDone: boolean;
  isRepeatable: boolean;
  userCompletions: number;
  maxCompletions: number;
  perPointCompletions: Record<string, number>;
}

export function LocationCompletion({
  taskId,
  projectId,
  points,
  locationData,
  isDone,
  isRepeatable,
  userCompletions,
  maxCompletions,
  perPointCompletions,
}: LocationCompletionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [awardedPoints, setAwardedPoints] = useState(0);
  const remaining = maxCompletions - userCompletions;
  const [batchCount, setBatchCount] = useState(1);

  async function handleConfirmLocation(data: {
    lat: number;
    lng: number;
    selectedPointId?: string;
  }) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: "location",
          count: batchCount,
          locationData: {
            ...data,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || L.completion.location.toastNetworkError);
        return;
      }

      setAwardedPoints(result.completion.points_awarded);
      setJustCompleted(true);
      toast.success(t(L.completion.location.toastSuccess, { points: result.completion.points_awarded }));
      router.refresh();
    } catch {
      toast.error(L.completion.location.toastNetworkError);
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
            <h3 className="font-semibold text-green-800 text-lg">{L.completion.location.successTitle}</h3>
            <p className="text-green-700 flex items-center justify-center gap-1 mt-1">
              <Zap className="h-4 w-4" />
              {t(L.completion.location.successPoints, { points: awardedPoints })}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push(`/projects/${projectId}`)}>
            {L.completion.location.backToProject}
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
          <p className="font-semibold text-green-700">{L.completion.location.alreadyDoneTitle}</p>
          <p className="text-sm text-green-600 mt-1">{L.completion.location.alreadyDoneText}</p>
        </CardContent>
      </Card>
    );
  }

  if (!locationData) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-muted-foreground text-sm">{L.completion.location.emptyConfig}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          {L.completion.location.cardTitle}
          {isRepeatable && (
            <span className="text-sm font-normal text-muted-foreground">
              {t(L.completion.location.repeatableHint, { count: userCompletions + 1, max: maxCompletions })}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRepeatable && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground shrink-0">{L.completion.location.batchLabel}</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setBatchCount((n) => Math.max(1, n - 1))}
                disabled={batchCount <= 1}
              >−</Button>
              <Input
                type="number"
                min={1}
                max={remaining}
                value={batchCount}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v)) setBatchCount(Math.min(remaining, Math.max(1, v)));
                }}
                className="w-16 text-center h-8"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setBatchCount((n) => Math.min(remaining, n + 1))}
                disabled={batchCount >= remaining}
              >+</Button>
            </div>
          </div>
        )}
        <LocationPicker
          locationData={locationData}
          onConfirm={handleConfirmLocation}
          disabled={loading}
          perPointCompletions={perPointCompletions}
        />
      </CardContent>
    </Card>
  );
}
