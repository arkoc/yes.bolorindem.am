"use client";

import L from "@/lib/labels";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { type TaskLocationData, type LocationTargetPoint } from "@/lib/db/schema";

const DEFAULT_RADIUS = 20;

interface LocationDataBuilderProps {
  data: TaskLocationData;
  onChange: (data: TaskLocationData) => void;
}

export function LocationDataBuilder({ data, onChange }: LocationDataBuilderProps) {
  const [newLabel, setNewLabel] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [maxCompletions, setMaxCompletions] = useState("");

  function addPoint() {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (!newLabel.trim() || isNaN(parsedLat) || isNaN(parsedLng)) return;

    const point: LocationTargetPoint = {
      id: `p_${Date.now()}`,
      lat: parsedLat,
      lng: parsedLng,
      label: newLabel.trim(),
      radiusMeters: DEFAULT_RADIUS,
      ...(maxCompletions ? { maxCompletions: parseInt(maxCompletions) } : {}),
    };

    onChange({
      ...data,
      targetPoints: [...(data.targetPoints ?? []), point],
      center: [parsedLat, parsedLng],
    });

    setNewLabel("");
    setLat("");
    setLng("");
    setMaxCompletions("");
  }

  function removePoint(id: string) {
    onChange({ ...data, targetPoints: data.targetPoints.filter((p) => p.id !== id) });
  }

  const hasCoords = lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">{L.forms.locationBuilder.descriptionLabel}</Label>
        <Textarea
          value={data.description ?? ""}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder={L.forms.locationBuilder.descriptionPlaceholder}
          rows={2}
          className="text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">{L.forms.locationBuilder.targetPointsHeading}</Label>

        {(data.targetPoints ?? []).map((point) => (
          <Card key={point.id} className="border border-border/50">
            <CardContent className="py-2 px-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{point.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                      {point.maxCompletions ? ` · max ${point.maxCompletions}×` : ""}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removePoint(point.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add new point */}
        <Card className="border-dashed">
          <CardContent className="py-3 px-3 space-y-2.5">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder={L.forms.locationBuilder.pointLabelPlaceholder}
              className="h-8 text-sm"
            />

            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder={L.forms.locationBuilder.latPlaceholder}
                className="h-8 text-sm"
              />
              <Input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder={L.forms.locationBuilder.lngPlaceholder}
                className="h-8 text-sm"
              />
              <Input
                type="number"
                min="1"
                value={maxCompletions}
                onChange={(e) => setMaxCompletions(e.target.value)}
                placeholder={L.forms.locationBuilder.maxCheckinsPlaceholder}
                className="h-8 text-sm"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-8 text-sm"
              onClick={addPoint}
              disabled={!newLabel.trim() || !hasCoords}
            >
              <Plus className="h-3.5 w-3.5" />
              {L.forms.locationBuilder.addPointBtn}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
