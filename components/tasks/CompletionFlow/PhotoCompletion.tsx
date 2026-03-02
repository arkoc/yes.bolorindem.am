"use client";

import L, { t } from "@/lib/labels";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Camera, Loader2, X, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PhotoCompletionProps {
  taskId: string;
  projectId: string;
  points: number;
  isDone: boolean;
  isRepeatable: boolean;
  userCompletions: number;
  maxCompletions: number;
}

export function PhotoCompletion({
  taskId,
  projectId,
  points,
  isDone,
  isRepeatable,
  userCompletions,
  maxCompletions,
}: PhotoCompletionProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [awardedPoints, setAwardedPoints] = useState(0);
  const remaining = maxCompletions - userCompletions;
  const batchCount = Math.min(selectedFiles.length || 1, remaining);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setSelectedFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!selectedFiles.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];

      for (const file of selectedFiles) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `task-evidence/${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("evidence")
          .upload(path, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("evidence").getPublicUrl(path);
        urls.push(publicUrl);
      }

      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskType: "photo", count: batchCount, evidenceUrls: urls }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || L.completion.photo.toastUploadFailed);
        return;
      }

      setAwardedPoints(result.completion.points_awarded);
      setJustCompleted(true);
      toast.success(t(L.completion.photo.toastSuccess, { points: result.completion.points_awarded }));
      router.refresh();
    } catch {
      toast.error(L.completion.photo.toastUploadFailed);
    } finally {
      setUploading(false);
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
            <h3 className="font-semibold text-green-800 text-lg">{L.completion.photo.successTitle}</h3>
            <p className="text-green-700 flex items-center justify-center gap-1 mt-1">
              <Zap className="h-4 w-4" />
              {t(L.completion.photo.successPoints, { points: awardedPoints })}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push(`/projects/${projectId}`)}>
            {L.completion.photo.backToProject}
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
          <p className="font-semibold text-green-700">{L.completion.photo.alreadyDoneTitle}</p>
          <p className="text-sm text-green-600 mt-1">{L.completion.photo.alreadyDoneText}</p>
        </CardContent>
      </Card>
    );
  }

  if (isDone && isRepeatable) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-6 text-center">
          <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-green-700">{t(L.completion.photo.allDoneTitle, { max: maxCompletions })}</p>
          <p className="text-sm text-green-600 mt-1">{L.completion.photo.allDoneText}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          {L.completion.photo.cardTitle}
          {isRepeatable && (
            <span className="text-sm font-normal text-muted-foreground">
              {t(L.completion.photo.repeatableHint, { count: userCompletions + 1, max: maxCompletions })}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Photo previews */}
        {previews.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative rounded-lg overflow-hidden border aspect-square bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* File input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Camera className="h-4 w-4" />
          {previews.length > 0 ? L.completion.photo.addPhoto : L.completion.photo.takePhoto}
        </Button>

        <Button
          type="button"
          className="w-full h-12"
          onClick={handleSubmit}
          disabled={!selectedFiles.length || uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              {t(L.completion.photo.submitBtn, { points: points * batchCount })}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
