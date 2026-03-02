"use client";

import L from "@/lib/labels";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { type FormSchema, type FormField, type FormFieldType } from "@/lib/db/schema";

interface FormSchemaBuilderProps {
  schema: FormSchema;
  onChange: (schema: FormSchema) => void;
}

const fieldTypeLabels: Record<FormFieldType, string> = {
  text: L.forms.formBuilder.typeText,
  number: L.forms.formBuilder.typeNumber,
  select: L.forms.formBuilder.typeSelect,
  checkbox: L.forms.formBuilder.typeCheckbox,
  link: L.forms.formBuilder.typeLink,
};

export function FormSchemaBuilder({ schema, onChange }: FormSchemaBuilderProps) {
  const [optionInputs, setOptionInputs] = useState<Record<string, string>>({});

  function addField() {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: "text",
      label: "",
      required: true,
    };
    onChange({ fields: [...schema.fields, newField] });
  }

  function updateField(id: string, updates: Partial<FormField>) {
    onChange({
      fields: schema.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    });
  }

  function removeField(id: string) {
    onChange({ fields: schema.fields.filter((f) => f.id !== id) });
  }

  function addOption(fieldId: string) {
    const option = optionInputs[fieldId]?.trim();
    if (!option) return;
    const field = schema.fields.find((f) => f.id === fieldId);
    if (!field) return;
    updateField(fieldId, { options: [...(field.options ?? []), option] });
    setOptionInputs((prev) => ({ ...prev, [fieldId]: "" }));
  }

  function removeOption(fieldId: string, option: string) {
    const field = schema.fields.find((f) => f.id === fieldId);
    if (!field) return;
    updateField(fieldId, { options: (field.options ?? []).filter((o) => o !== option) });
  }

  return (
    <div className="space-y-3">
      {schema.fields.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {L.forms.formBuilder.emptyState}
        </p>
      )}

      {schema.fields.map((field, index) => (
        <Card key={field.id} className="border border-border/50">
          <CardContent className="pt-4 pb-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground font-medium">Field {index + 1}</span>
                <div className="ml-auto flex items-center gap-2">
                  <Switch
                    id={`required-${field.id}`}
                    checked={field.required}
                    onCheckedChange={(v) => updateField(field.id, { required: v })}
                  />
                  <Label htmlFor={`required-${field.id}`} className="text-xs font-normal">{L.forms.formBuilder.requiredLabel}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeField(field.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{L.forms.formBuilder.fieldLabel}</Label>
                  <Input
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    placeholder={L.forms.formBuilder.fieldLabelPlaceholder}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{L.forms.formBuilder.typeLabel}</Label>
                  <Select
                    value={field.type}
                    onValueChange={(v) => updateField(field.id, { type: v as FormFieldType, options: undefined })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(fieldTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Options for select type */}
              {field.type === "select" && (
                <div className="space-y-2">
                  <Label className="text-xs">{L.forms.formBuilder.optionsHeading}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {(field.options ?? []).map((opt) => (
                      <span
                        key={opt}
                        className="inline-flex items-center gap-1 bg-secondary rounded-full px-2.5 py-0.5 text-xs"
                      >
                        {opt}
                        <button
                          type="button"
                          onClick={() => removeOption(field.id, opt)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={optionInputs[field.id] ?? ""}
                      onChange={(e) =>
                        setOptionInputs((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addOption(field.id);
                        }
                      }}
                      placeholder={L.forms.formBuilder.addOptionPlaceholder}
                      className="h-8 text-sm flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => addOption(field.id)}
                    >
                      {L.forms.formBuilder.addOptionBtn}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={addField}
      >
        <Plus className="h-4 w-4" /> {L.forms.formBuilder.addFieldBtn}
      </Button>
    </div>
  );
}
