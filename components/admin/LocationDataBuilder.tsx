"use client";

import L from "@/lib/labels";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Plus, Trash2, ExternalLink } from "lucide-react";
import { type TaskLocationData, type LocationTargetPoint } from "@/lib/db/schema";

// Yandex Maps URL uses lng,lat order for both ll= and pt= params
function parseYandexUrl(url: string): { lat: number; lng: number } | null {
  try {
    const u = new URL(url);
    const pt = u.searchParams.get("pt");
    if (pt) {
      const [lng, lat] = pt.split(",").map(Number);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    const ll = u.searchParams.get("ll");
    if (ll) {
      const [lng, lat] = ll.split(",").map(Number);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    return null;
  } catch {
    return null;
  }
}

interface LocationDataBuilderProps {
  data: TaskLocationData;
  onChange: (data: TaskLocationData) => void;
}

export function LocationDataBuilder({ data, onChange }: LocationDataBuilderProps) {
  const [newPoint, setNewPoint] = useState({ label: "", radius: "100", lat: "", lng: "", maxCompletions: "" });
  const [yandexUrl, setYandexUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  function handleYandexUrl(url: string) {
    setYandexUrl(url);
    setUrlError("");
    if (!url.trim()) return;
    const coords = parseYandexUrl(url);
    if (coords) {
      setNewPoint((p) => ({ ...p, lat: coords.lat.toFixed(6), lng: coords.lng.toFixed(6) }));
    } else if (url.length > 10) {
      setUrlError(L.forms.locationBuilder.invalidUrl);
    }
  }

  function addPoint() {
    const lat = parseFloat(newPoint.lat);
    const lng = parseFloat(newPoint.lng);
    if (!newPoint.label.trim() || isNaN(lat) || isNaN(lng)) return;

    const point: LocationTargetPoint = {
      id: `p_${Date.now()}`,
      lat,
      lng,
      label: newPoint.label.trim(),
      radiusMeters: parseInt(newPoint.radius) || 100,
      ...(newPoint.maxCompletions ? { maxCompletions: parseInt(newPoint.maxCompletions) } : {}),
    };

    onChange({
      ...data,
      targetPoints: [...(data.targetPoints ?? []), point],
      center: [lat, lng],
    });

    setNewPoint({ label: "", radius: "100", lat: "", lng: "", maxCompletions: "" });
    setYandexUrl("");
    setUrlError("");
  }

  function removePoint(id: string) {
    onChange({ ...data, targetPoints: data.targetPoints.filter((p) => p.id !== id) });
  }

  const hasCoords = newPoint.lat && newPoint.lng && !isNaN(parseFloat(newPoint.lat)) && !isNaN(parseFloat(newPoint.lng));

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
        <Label className="text-xs font-semibold">Target Points</Label>

        {(data.targetPoints ?? []).map((point) => (
          <Card key={point.id} className="border border-border/50">
            <CardContent className="py-2 px-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{point.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {point.lat.toFixed(5)}, {point.lng.toFixed(5)} · {point.radiusMeters}m
                      {point.maxCompletions ? ` · max ${point.maxCompletions}×` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={`https://yandex.com/maps/?pt=${point.lng},${point.lat}&z=16`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-muted-foreground hover:text-primary"
                    title="Preview on Yandex Maps"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
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
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add new point */}
        <Card className="border-dashed">
          <CardContent className="py-3 px-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={newPoint.label}
                onChange={(e) => setNewPoint((p) => ({ ...p, label: e.target.value }))}
                placeholder="Point label"
                className="h-8 text-sm"
              />
              <Input
                type="number"
                value={newPoint.radius}
                onChange={(e) => setNewPoint((p) => ({ ...p, radius: e.target.value }))}
                placeholder="Radius (m)"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <a
                  href="https://yandex.com/maps/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-xs rounded-md border border-input bg-background hover:bg-accent transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Open Yandex Maps
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span className="text-xs text-muted-foreground">right-click a spot → copy URL → paste below</span>
              </div>
              <Input
                value={yandexUrl}
                onChange={(e) => handleYandexUrl(e.target.value)}
                placeholder="Paste Yandex Maps URL here..."
                className="h-8 text-sm"
              />
              {urlError && <p className="text-xs text-destructive">{urlError}</p>}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                step="any"
                value={newPoint.lat}
                onChange={(e) => setNewPoint((p) => ({ ...p, lat: e.target.value }))}
                placeholder="Latitude"
                className="h-8 text-sm"
              />
              <Input
                type="number"
                step="any"
                value={newPoint.lng}
                onChange={(e) => setNewPoint((p) => ({ ...p, lng: e.target.value }))}
                placeholder="Longitude"
                className="h-8 text-sm"
              />
              <Input
                type="number"
                min="1"
                value={newPoint.maxCompletions}
                onChange={(e) => setNewPoint((p) => ({ ...p, maxCompletions: e.target.value }))}
                placeholder="Max check-ins"
                className="h-8 text-sm"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-8 text-sm"
              onClick={addPoint}
              disabled={!newPoint.label.trim() || !hasCoords}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Point
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
