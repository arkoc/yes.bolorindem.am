"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Navigation, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { type TaskLocationData, type LocationTargetPoint } from "@/lib/db/schema";
import L, { t } from "@/lib/labels";
import { haversineMeters } from "@/lib/geo";

const MapView = dynamic(
  () => import("./MapView").then((m) => ({ default: m.MapView })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border bg-muted animate-pulse" style={{ height: 280 }} />
    ),
  }
);

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
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);

  function getNearestPoint(lat: number, lng: number): LocationTargetPoint | undefined {
    if (!locationData.targetPoints?.length) return undefined;
    let nearest = locationData.targetPoints[0];
    let minDist = Infinity;
    for (const p of locationData.targetPoints) {
      const d = haversineMeters(lat, lng, p.lat, p.lng);
      if (d < minDist) { minDist = d; nearest = p; }
    }
    return nearest;
  }

  const handleGetLocation = useCallback(async () => {
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
      const nearest = getNearestPoint(lat, lng);
      setSelectedPointId(nearest?.id);
      setDistanceMeters(nearest ? haversineMeters(lat, lng, nearest.lat, nearest.lng) : null);
    } catch {
      import("sonner").then(({ toast }) =>
        toast.error("Could not get location. Please enable location access.")
      );
    } finally {
      setGettingLocation(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-request location on mount
  useEffect(() => {
    if (navigator.geolocation) handleGetLocation();
  }, [handleGetLocation]);

  // When user taps a point on the map, update selected + distance
  function handleSelectPoint(pointId: string) {
    setSelectedPointId(pointId);
    if (userLocation) {
      const p = (locationData.targetPoints ?? []).find((pt) => pt.id === pointId);
      if (p) setDistanceMeters(haversineMeters(userLocation.lat, userLocation.lng, p.lat, p.lng));
    }
  }

  const points = locationData.targetPoints ?? [];
  const selectedPoint = points.find((p) => p.id === selectedPointId);
  const withinRadius =
    !selectedPoint?.radiusMeters ||
    distanceMeters === null ||
    distanceMeters <= selectedPoint.radiusMeters;

  const pointExhausted =
    selectedPointId !== undefined &&
    selectedPoint?.maxCompletions !== undefined &&
    (perPointCompletions[selectedPointId] ?? 0) >= selectedPoint.maxCompletions;

  function handleConfirm() {
    if (!userLocation || !withinRadius || pointExhausted) return;
    onConfirm({ ...userLocation, selectedPointId });
  }

  return (
    <div className="space-y-3">
      {locationData.description && (
        <p className="text-sm text-muted-foreground">{locationData.description}</p>
      )}

      {/* Map */}
      <MapView
        center={locationData.center}
        zoom={locationData.defaultZoom}
        targetPoints={points}
        userLocation={userLocation}
        selectedPointId={selectedPointId}
        onSelectPoint={handleSelectPoint}
        perPointCompletions={perPointCompletions}
      />

      {/* Target points list */}
      {points.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {L.completion.location.targetLocations}
          </p>
          {points.map((p) => {
            const done = perPointCompletions[p.id] ?? 0;
            const limit = p.maxCompletions;
            const exhausted = limit !== undefined && done >= limit;
            const isSelected = selectedPointId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={exhausted}
                onClick={() => handleSelectPoint(p.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : exhausted
                    ? "opacity-50 border-border bg-muted cursor-not-allowed"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <MapPin className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary" : exhausted ? "text-muted-foreground" : "text-primary"}`} />
                  <span className={`truncate font-medium ${exhausted ? "text-muted-foreground" : ""}`}>
                    {p.label}
                  </span>
                  {p.radiusMeters && (
                    <span className="text-muted-foreground text-xs shrink-0">within {p.radiusMeters}m</span>
                  )}
                </div>
                {limit !== undefined && (
                  <span className={`text-xs font-medium shrink-0 ${exhausted ? "text-destructive" : "text-muted-foreground"}`}>
                    {exhausted ? L.completion.location.pointFull : `${done}/${limit}`}
                  </span>
                )}
              </button>
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
              {L.completion.location.viewAllOnMap}
            </a>
          )}
        </div>
      )}

      {/* Location status */}
      <div className="space-y-2">
        {userLocation && (
          <div className="space-y-1">
            <p className="text-xs text-center text-muted-foreground">
              {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
              {selectedPoint && <> — near &ldquo;{selectedPoint.label}&rdquo;</>}
            </p>
            {selectedPoint?.radiusMeters && distanceMeters !== null && (
              <p className={`text-xs text-center font-medium flex items-center justify-center gap-1 ${withinRadius ? "text-green-600" : "text-destructive"}`}>
                {withinRadius ? (
                  <><CheckCircle className="h-3.5 w-3.5" /> {t(L.completion.location.withinRange, { distance: Math.round(distanceMeters) })}</>
                ) : (
                  <><AlertCircle className="h-3.5 w-3.5" /> {t(L.completion.location.tooFar, { distance: Math.round(distanceMeters), radius: selectedPoint.radiusMeters })}</>
                )}
              </p>
            )}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGetLocation}
          disabled={gettingLocation || disabled}
        >
          {gettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
          {gettingLocation
            ? L.completion.location.getLocationBtn
            : userLocation
              ? L.completion.location.updateLocationBtn
              : L.completion.location.getLocationBtn}
        </Button>

        <Button
          type="button"
          className="w-full h-12"
          onClick={handleConfirm}
          disabled={!userLocation || disabled || !withinRadius || pointExhausted}
        >
          {L.completion.location.confirmBtn}
        </Button>
      </div>
    </div>
  );
}
