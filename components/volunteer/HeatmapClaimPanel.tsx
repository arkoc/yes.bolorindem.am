"use client";

import { MapPin, X, Navigation, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type HeatmapPoint } from "./heatmap-types";
import L, { t } from "@/lib/labels";

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CLAIM_RADIUS_METERS = 15;

interface HeatmapClaimPanelProps {
  point: HeatmapPoint;
  currentPointValue: number;
  userLocation: { lat: number; lng: number } | null;
  onGetLocation: () => void;
  onClaim: () => void;
  claiming: boolean;
  result: { ok: boolean; reason?: string; distance?: number; points?: number } | null;
  onClose: () => void;
}

export function HeatmapClaimPanel({
  point,
  currentPointValue,
  userLocation,
  onGetLocation,
  onClaim,
  claiming,
  result,
  onClose,
}: HeatmapClaimPanelProps) {
  const isClaimed = point.claimed_by !== null;
  const distance = userLocation
    ? Math.round(haversineMeters(userLocation.lat, userLocation.lng, point.lat, point.lng))
    : null;
  const withinRange = distance !== null && distance <= CLAIM_RADIUS_METERS;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        background: "white",
        borderRadius: "16px 16px 0 0",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
        zIndex: 10,
        maxWidth: 480,
        margin: "0 auto",
      }}
      className="px-5 pt-5 pb-[112px] md:pb-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: isClaimed ? "#cc0000" : "#9ca3af",
              flexShrink: 0,
              marginTop: 4,
            }}
          />
          <div>
            <p className="font-semibold text-sm">
              {t(L.heatmap.dotPointValue, { points: currentPointValue })}
            </p>
            <p className="text-xs text-muted-foreground">
              {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Already claimed */}
      {isClaimed && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>
            {L.heatmap.alreadyClaimed}
            {point.claimer_name && (
              <span className="font-medium"> — {point.claimer_name}</span>
            )}
          </span>
        </div>
      )}

      {/* Success state */}
      {result?.ok && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{t(L.heatmap.claimSuccessPoints, { points: result.points ?? 0 })}</span>
        </div>
      )}

      {/* Error state */}
      {result && !result.ok && result.reason !== "already_claimed" && (
        <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 rounded-lg px-3 py-2 mb-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {result.reason === "too_far"
              ? t(L.heatmap.errorTooFar, { distance: result.distance ?? 0, radius: CLAIM_RADIUS_METERS })
              : L.heatmap.errorGeneric}
          </span>
        </div>
      )}

      {!isClaimed && !result?.ok && (
        <>
          {/* Location status */}
          {userLocation ? (
            <div className="flex items-center gap-2 text-xs mb-3">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {withinRange ? (
                <span className="text-green-600 font-medium">
                  {t(L.heatmap.withinRange, { distance: distance ?? 0 })}
                </span>
              ) : (
                <span className="text-orange-600">
                  {t(L.heatmap.tooFarLocation, { distance: distance ?? 0, radius: CLAIM_RADIUS_METERS })}
                </span>
              )}
              <button
                onClick={onGetLocation}
                className="ml-auto text-primary text-xs underline"
              >
                {L.heatmap.recenterBtn}
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full mb-3"
              onClick={onGetLocation}
            >
              <Navigation className="h-3.5 w-3.5 mr-2" />
              {L.heatmap.getLocationBtn}
            </Button>
          )}

          {/* Claim button */}
          <Button
            className="w-full"
            disabled={!userLocation || !withinRange || claiming}
            onClick={onClaim}
          >
            {claiming ? L.heatmap.claimingBtn : t(L.heatmap.claimBtn, { points: currentPointValue })}
          </Button>
        </>
      )}
    </div>
  );
}
