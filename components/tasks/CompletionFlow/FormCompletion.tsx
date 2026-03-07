"use client";

import L, { t } from "@/lib/labels";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Loader2, Zap, FileText, ExternalLink } from "lucide-react";
import { type FormSchema } from "@/lib/db/schema";

interface FormCompletionProps {
  taskId: string;
  projectId: string;
  points: number;
  formSchema: FormSchema | null;
  isDone: boolean;
  isRepeatable: boolean;
  userCompletions: number;
  maxCompletions: number;
}

function LinkField({
  id,
  required,
  label,
  register,
}: {
  id: string;
  required: boolean;
  label: string;
  register: ReturnType<typeof useForm<Record<string, string>>>["register"];
}) {
  const [preview, setPreview] = useState("");

  const isValid = (() => {
    try { new URL(preview); return true; } catch { return false; }
  })();

  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        type="url"
        placeholder="https://..."
        {...register(id, {
          required: required ? t(L.completion.form.fieldRequired, { label }) : false,
          validate: (v) => !v || (() => { try { new URL(v); return true; } catch { return L.completion.form.validUrlError; } })(),
        })}
        onInput={(e) => setPreview((e.target as HTMLInputElement).value)}
        className="flex-1"
      />
      {isValid && (
        <a
          href={preview}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-2 rounded-md border hover:bg-accent transition-colors"
          title="Open link"
        >
          <ExternalLink className="h-4 w-4 text-primary" />
        </a>
      )}
    </div>
  );
}

export function FormCompletion({
  taskId,
  projectId,
  points,
  formSchema,
  isDone,
  isRepeatable,
  userCompletions,
  maxCompletions,
}: FormCompletionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [awardedPoints, setAwardedPoints] = useState(0);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Record<string, string>>();

  async function onSubmit(formData: Record<string, string>) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskType: "form", formData }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || L.completion.form.toastFailed);
        return;
      }

      setAwardedPoints(data.completion.points_awarded);
      setJustCompleted(true);
      toast.success(t(L.completion.form.toastSuccess, { points: data.completion.points_awarded }));
      router.refresh();
    } catch {
      toast.error(L.completion.form.toastNetworkError);
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
            <h3 className="font-semibold text-green-800 text-lg">{L.completion.form.successTitle}</h3>
            <p className="text-green-700 flex items-center justify-center gap-1 mt-1">
              <Zap className="h-4 w-4" />
              {t(L.completion.form.successPoints, { points: awardedPoints })}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push(`/projects/${projectId}`)}>
            {L.completion.form.backToProject}
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
          <p className="font-semibold text-green-700">{L.completion.form.alreadyDoneTitle}</p>
        </CardContent>
      </Card>
    );
  }

  if (isDone && isRepeatable) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-6 text-center">
          <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-green-700">{t(L.completion.form.allDoneTitle, { max: maxCompletions })}</p>
          <p className="text-sm text-green-600 mt-1">{L.completion.form.allDoneText}</p>
        </CardContent>
      </Card>
    );
  }

  if (!formSchema || !formSchema.fields?.length) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-muted-foreground text-sm">{L.completion.form.emptyForm}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {L.completion.form.cardTitle}
          {isRepeatable && (
            <span className="text-sm font-normal text-muted-foreground">
              {t(L.completion.form.repeatableHint, { count: userCompletions + 1, max: maxCompletions })}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formSchema.fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>

              {field.type === "text" && (
                <Input
                  id={field.id}
                  {...register(field.id, { required: field.required ? t(L.completion.form.fieldRequired, { label: field.label }) : false })}
                  placeholder={field.label}
                />
              )}

              {field.type === "number" && (
                <Input
                  id={field.id}
                  type="number"
                  inputMode="numeric"
                  {...register(field.id, { required: field.required ? t(L.completion.form.fieldRequired, { label: field.label }) : false })}
                  placeholder="0"
                />
              )}

              {field.type === "select" && field.options && (
                <Select onValueChange={(v) => setValue(field.id, v)}>
                  <SelectTrigger id={field.id}>
                    <SelectValue placeholder={t(L.completion.form.selectPlaceholder, { label: field.label })} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.filter((opt) => opt !== "").map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {field.type === "checkbox" && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={field.id}
                    {...register(field.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor={field.id} className="font-normal">{field.label}</Label>
                </div>
              )}

              {field.type === "link" && (
                <LinkField
                  id={field.id}
                  required={field.required}
                  label={field.label}
                  register={register}
                />
              )}

              {errors[field.id] && (
                <p className="text-xs text-destructive">{errors[field.id]?.message as string}</p>
              )}
            </div>
          ))}

          <Button type="submit" disabled={loading} className="w-full h-12 text-base mt-2">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                {t(L.completion.form.submitBtn, { points })}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
