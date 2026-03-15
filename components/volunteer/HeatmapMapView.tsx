"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Map, {
  Source,
  Layer,
  Marker,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { createClient } from "@/lib/supabase/client";
import { HeatmapClaimPanel } from "./HeatmapClaimPanel";
import { HeatmapProgressBar } from "./HeatmapProgressBar";
import { toast } from "sonner";
import { type HeatmapPoint } from "./heatmap-types";
import L, { t } from "@/lib/labels";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const CLAIM_RADIUS_METERS = 20;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface HeatmapMapViewProps {
  initialPoints: HeatmapPoint[];
  projectId: string;
  currentUserId: string;
  currentUserName: string;
}

export function HeatmapMapView({ initialPoints, projectId, currentUserId, currentUserName }: HeatmapMapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [points, setPoints] = useState<HeatmapPoint[]>(initialPoints);
  const [selectedPoint, setSelectedPoint] = useState<HeatmapPoint | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [claimResult, setClaimResult] = useState<{
    ok: boolean;
    reason?: string;
    distance?: number;
    points?: number;
  } | null>(null);
  const [claiming, setClaiming] = useState(false);

  // Lock body scroll while fullscreen map is mounted
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Continuous GPS tracking — essential for a walking game
  const hasFlownToUser = useRef(false);
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        // Fly to user on first fix only
        if (!hasFlownToUser.current) {
          hasFlownToUser.current = true;
          mapRef.current?.flyTo({
            center: [loc.lng, loc.lat],
            zoom: 16,
            duration: 1200,
          });
        }
      },
      () => {}, // user denied — they can tap the button later
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`heatmap-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "heatmap_points",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const updated = payload.new as HeatmapPoint;
          setPoints((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
          );
          setSelectedPoint((prev) =>
            prev?.id === updated.id ? { ...prev, ...updated } : prev
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Live counts derived from state
  const claimedCount = useMemo(() => points.filter((p) => p.claimed_by !== null).length, [points]);
  const userClaimedCount = useMemo(
    () => points.filter((p) => p.claimed_by === currentUserId).length,
    [points, currentUserId]
  );
  const userPoints = useMemo(
    () => points.filter((p) => p.claimed_by === currentUserId).reduce((sum, p) => sum + p.points, 0),
    [points, currentUserId]
  );
  const currentPointValue = Math.min(200, Math.round(10 + (claimedCount / 2000) * 190));

  // Build GeoJSON — split into three layers: claimed, in-range unclaimed, far unclaimed
  const { geojsonClaimed, geojsonInRange, geojsonFar } = useMemo(() => {
    const claimed: GeoJSON.Feature[] = [];
    const inRange: GeoJSON.Feature[] = [];
    const far: GeoJSON.Feature[] = [];

    for (const p of points) {
      const feature: GeoJSON.Feature = {
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          points: p.points,
          ownedByMe: p.claimed_by === currentUserId,
        },
      };

      if (p.claimed_by !== null) {
        claimed.push(feature);
      } else if (
        userLocation !== null &&
        haversineMeters(userLocation.lat, userLocation.lng, p.lat, p.lng) <= CLAIM_RADIUS_METERS
      ) {
        inRange.push(feature);
      } else {
        far.push(feature);
      }
    }

    const toFC = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({
      type: "FeatureCollection",
      features,
    });

    return {
      geojsonClaimed: toFC(claimed),
      geojsonInRange: toFC(inRange),
      geojsonFar: toFC(far),
    };
  }, [points, userLocation, currentUserId]);

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (feature?.properties?.id) {
        const pt = points.find((p) => p.id === feature.properties!.id);
        if (pt) {
          setSelectedPoint(pt);
          setClaimResult(null);
        }
      } else {
        setSelectedPoint(null);
      }
    },
    [points]
  );

  // Re-center on user when tapped
  const handleGetLocation = useCallback(() => {
    if (userLocation) {
      mapRef.current?.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 16, duration: 800 });
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          mapRef.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 16, duration: 800 });
        },
        () => {}
      );
    }
  }, [userLocation]);

  const handleClaim = useCallback(async () => {
    if (!selectedPoint || !userLocation) return;
    setClaiming(true);
    setClaimResult(null);
    try {
      const res = await fetch(`/api/heatmap/${projectId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pointId: selectedPoint.id,
          lat: userLocation.lat,
          lng: userLocation.lng,
        }),
      });
      const data = await res.json();
      setClaimResult(data);
      if (data.ok) {
        if (data.projectComplete) {
          toast.success(L.heatmap.completionToastTitle, {
            description: t(L.heatmap.completionToastDesc, { points: data.points, bonus: data.completionBonus }),
            duration: 6000,
          });
        } else {
          toast.success(t(L.heatmap.claimToastTitle, { points: data.points }), {
            description: L.heatmap.claimToastDesc,
            duration: 3000,
          });
        }
        setPoints((prev) =>
          prev.map((p) =>
            p.id === selectedPoint.id ? { ...p, claimed_by: currentUserId, claimer_name: currentUserName } : p
          )
        );
        setSelectedPoint((prev) =>
          prev ? { ...prev, claimed_by: currentUserId, claimer_name: currentUserName } : prev
        );
      }
    } catch {
      setClaimResult({ ok: false, reason: "network_error" });
    } finally {
      setClaiming(false);
    }
  }, [selectedPoint, userLocation, projectId, currentUserId, currentUserName]);

  return (
    <div style={{ width: "100%", height: "100dvh", position: "relative" }}>
      {/* Live progress bar — updates as dots are claimed */}
      <HeatmapProgressBar
        claimed={claimedCount}
        total={points.length}
        userClaimed={userClaimedCount}
        userPoints={userPoints}
      />

      <Map
        ref={mapRef}
        initialViewState={{
          latitude: 40.187,
          longitude: 44.515,
          zoom: 13,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        reuseMaps
        attributionControl={false}
        interactiveLayerIds={["heatmap-dots-claimed", "heatmap-dots-far", "heatmap-dots-inrange"]}
        onClick={handleMapClick}
      >
        {/* Claimed dots — red; user's own dots get a black border */}
        <Source id="heatmap-claimed" type="geojson" data={geojsonClaimed}>
          <Layer
            id="heatmap-dots-claimed"
            type="circle"
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2, 10, 4, 14, 8],
              "circle-color": "#cc0000",
              "circle-opacity": 0.9,
              "circle-stroke-width": ["case", ["get", "ownedByMe"], 2.5, 1],
              "circle-stroke-color": ["case", ["get", "ownedByMe"], "#000000", "#7f1d1d"],
            }}
          />
        </Source>

        {/* In-range dots — green pulse, immediately claimable */}
        <Source id="heatmap-inrange" type="geojson" data={geojsonInRange}>
          <Layer
            id="heatmap-dots-inrange-glow"
            type="circle"
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 6, 10, 10, 14, 18],
              "circle-color": "#22c55e",
              "circle-opacity": 0.2,
              "circle-stroke-width": 0,
            }}
          />
          <Layer
            id="heatmap-dots-inrange"
            type="circle"
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 3, 10, 5, 14, 9],
              "circle-color": "#16a34a",
              "circle-opacity": 1,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            }}
          />
        </Source>

        {/* Far unclaimed dots — gray */}
        <Source id="heatmap-far" type="geojson" data={geojsonFar}>
          <Layer
            id="heatmap-dots-far"
            type="circle"
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2, 10, 4, 14, 7],
              "circle-color": "#9ca3af",
              "circle-opacity": 0.8,
              "circle-stroke-width": 1,
              "circle-stroke-color": "#6b7280",
            }}
          />
        </Source>

        {/* User location — pulsing blue dot */}
        {userLocation && (
          <Marker
            latitude={userLocation.lat}
            longitude={userLocation.lng}
            anchor="center"
          >
            <div style={{ position: "relative", width: 20, height: 20 }}>
              <div
                style={{
                  position: "absolute",
                  inset: -4,
                  borderRadius: "50%",
                  background: "rgba(59,130,246,0.25)",
                  animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
                }}
              />
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#3b82f6",
                  border: "3px solid white",
                  boxShadow: "0 1px 6px rgba(59,130,246,0.6)",
                }}
              />
            </div>
          </Marker>
        )}
      </Map>

      {/* Center on user button */}
      <button
        onClick={handleGetLocation}
        style={{
          position: "absolute",
          right: 16,
          zIndex: 10,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "bottom 0.2s ease",
        }}
        className={selectedPoint
          ? "bottom-[300px] md:bottom-[220px]"
          : "bottom-[104px] md:bottom-6"}
        title="Center on my location"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
      </button>

      {/* Claim panel */}
      {selectedPoint && (
        <HeatmapClaimPanel
          point={selectedPoint}
          currentPointValue={currentPointValue}
          userLocation={userLocation}
          onGetLocation={handleGetLocation}
          onClaim={handleClaim}
          claiming={claiming}
          result={claimResult}
          onClose={() => setSelectedPoint(null)}
        />
      )}
    </div>
  );
}
