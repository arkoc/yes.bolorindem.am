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

const DEFAULT_RADIUS = 100;

/**
 * Parse coordinates from a Google Maps or Yandex Maps URL.
 *
 * Google formats:
 *   https://www.google.com/maps/@lat,lng,15z
 *   https://www.google.com/maps/place/Name/@lat,lng,15z
 *   https://www.google.com/maps?q=lat,lng
 *   https://maps.google.com/?ll=lat,lng   (lat,lng order)
 *
 * Yandex formats:
 *   https://yandex.com/maps/?pt=lng,lat   (lng first!)
 *   https://yandex.com/maps/?ll=lng,lat   (lng first!)
 */
function parseMapUrl(url: string): { lat: number; lng: number } | null {
  try {
    const u = new URL(url);
    const host = u.hostname;

    // ── Google Maps ────────────────────────────────────────────
    if (host.includes("google.com") || host.includes("maps.app.goo.gl")) {
      // @lat,lng,zoom pattern (most common share URL)
      const atMatch = u.pathname.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (atMatch) {
        const lat = parseFloat(atMatch[1]);
        const lng = parseFloat(atMatch[2]);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
      // ?q=lat,lng
      const q = u.searchParams.get("q");
      if (q) {
        const [lat, lng] = q.split(",").map(Number);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
      // ?ll=lat,lng (Google uses lat,lng order here)
      const ll = u.searchParams.get("ll");
      if (ll) {
        const [lat, lng] = ll.split(",").map(Number);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
    }

    // ── Yandex Maps ────────────────────────────────────────────
    if (host.includes("yandex.")) {
      // pt=lng,lat (Yandex uses lng first)
      const pt = u.searchParams.get("pt");
      if (pt) {
        const [lng, lat] = pt.split(",").map(Number);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
      // ll=lng,lat
      const ll = u.searchParams.get("ll");
      if (ll) {
        const [lng, lat] = ll.split(",").map(Number);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
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
  const [newLabel, setNewLabel] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [maxCompletions, setMaxCompletions] = useState("");
  const [urlError, setUrlError] = useState("");

  function handleMapUrl(url: string) {
    setMapUrl(url);
    setUrlError("");
    if (!url.trim()) return;
    const coords = parseMapUrl(url);
    if (coords) {
      setLat(coords.lat.toFixed(6));
      setLng(coords.lng.toFixed(6));
    } else if (url.length > 10) {
      setUrlError(L.forms.locationBuilder.invalidUrl);
    }
  }

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
    setMapUrl("");
    setLat("");
    setLng("");
    setMaxCompletions("");
    setUrlError("");
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
                <div className="flex items-center gap-1">
                  <a
                    href={`https://www.google.com/maps?q=${point.lat},${point.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-muted-foreground hover:text-primary"
                    title="Preview on Google Maps"
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
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder={L.forms.locationBuilder.pointLabelPlaceholder}
              className="h-8 text-sm"
            />

            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">{L.forms.locationBuilder.pasteHint}</p>
              <Input
                value={mapUrl}
                onChange={(e) => handleMapUrl(e.target.value)}
                placeholder={L.forms.locationBuilder.pasteUrlPlaceholder}
                className="h-8 text-sm"
              />
              {urlError && <p className="text-xs text-destructive">{urlError}</p>}
            </div>

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
