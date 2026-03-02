"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Navigation, ExternalLink } from "lucide-react";
import { type TaskLocationData, type LocationTargetPoint } from "@/lib/db/schema";

interface LocationPickerProps {
  locationData: TaskLocationData;
  onConfirm: (data: { lat: number; lng: number; selectedPointId?: string }) => void;
  disabled?: boolean;
  perPointCompletions?: Record<string, number>;
}

function buildYandexUrl(points: LocationTargetPoint[], center: [number, number], zoom?: number): string {
  if (!points.length) {
    return `https://yandex.com/maps/?ll=${center[1]},${center[0]}&z=${zoom ?? 15}`;
  }
  if (points.length === 1) {
    return `https://yandex.com/maps/?pt=${points[0].lng},${points[0].lat}&z=16`;
  }
  const pt = points.map((p) => `${p.lng},${p.lat},pm2rdm`).join("~");
  return `https://yandex.com/maps/?pt=${pt}&z=14`;
}

export function LocationPicker({ locationData, onConfirm, disabled, perPointCompletions = {} }: LocationPickerProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [selectedPointId, setSelectedPointId] = useState<string | undefined>();

  function getNearestPoint(lat: number, lng: number): LocationTargetPoint | undefined {
    if (!locationData.targetPoints?.length) return undefined;
    let nearest = locationData.targetPoints[0];
    let minDist = Infinity;
    for (const p of locationData.targetPoints) {
      const d = Math.sqrt((p.lat - lat) ** 2 + (p.lng - lng) ** 2);
      if (d < minDist) { minDist = d; nearest = p; }
    }
    return nearest;
  }

  async function handleGetLocation() {
    setGettingLocation(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      setUserLocation({ lat, lng });
      setSelectedPointId(getNearestPoint(lat, lng)?.id);
    } catch {
      import("sonner").then(({ toast }) =>
        toast.error("Could not get location. Please enable location access.")
      );
    } finally {
      setGettingLocation(false);
    }
  }

  function handleConfirm() {
    if (!userLocation) return;
    if (selectedPointId) {
      const point = locationData.targetPoints?.find((p) => p.id === selectedPointId);
      const done = perPointCompletions[selectedPointId] ?? 0;
      if (point?.maxCompletions !== undefined && done >= point.maxCompletions) return;
    }
    onConfirm({ ...userLocation, selectedPointId });
  }

  const points = locationData.targetPoints ?? [];

  return (
    <div className="space-y-3">
      {locationData.description && (
        <p className="text-sm text-muted-foreground">{locationData.description}</p>
      )}

      {points.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Target Locations</p>
          {points.map((p) => {
            const done = perPointCompletions[p.id] ?? 0;
            const limit = p.maxCompletions;
            const exhausted = limit !== undefined && done >= limit;
            return (
              <div key={p.id} className={`flex items-center justify-between gap-2 ${exhausted ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <MapPin className={`h-3.5 w-3.5 shrink-0 ${exhausted ? "text-muted-foreground" : "text-primary"}`} />
                  <a
                    href={`https://yandex.com/maps/?pt=${p.lng},${p.lat}&z=16`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`truncate hover:underline ${exhausted ? "text-muted-foreground" : "text-primary font-medium"}`}
                  >
                    {p.label}
                  </a>
                  {p.radiusMeters && (
                    <span className="text-muted-foreground text-xs shrink-0">within {p.radiusMeters}m</span>
                  )}
                </div>
                {limit !== undefined && (
                  <span className={`text-xs font-medium shrink-0 ${exhausted ? "text-destructive" : "text-muted-foreground"}`}>
                    {exhausted ? "Full" : `${done}/${limit}`}
                  </span>
                )}
              </div>
            );
          })}
          {points.length > 1 && (
            <a
              href={buildYandexUrl(points, locationData.center, locationData.defaultZoom)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-0.5"
            >
              <ExternalLink className="h-3 w-3" />
              View all on Yandex Maps
            </a>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGetLocation}
          disabled={gettingLocation || disabled}
        >
          {gettingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          {userLocation ? "Update My Location" : "Get My Location"}
        </Button>

        {userLocation && (
          <p className="text-xs text-center text-muted-foreground">
            Located: {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
            {selectedPointId && (
              <> — near &ldquo;{points.find((p) => p.id === selectedPointId)?.label}&rdquo;</>
            )}
          </p>
        )}

        <Button
          type="button"
          className="w-full h-12"
          onClick={handleConfirm}
          disabled={!userLocation || disabled || (() => {
            if (!selectedPointId) return false;
            const pt = points.find((p) => p.id === selectedPointId);
            return pt?.maxCompletions !== undefined && (perPointCompletions[selectedPointId] ?? 0) >= pt.maxCompletions;
          })()}
        >
          Confirm Location & Complete Task
        </Button>
      </div>
    </div>
  );
}
