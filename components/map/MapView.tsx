"use client";

import { useRef, useEffect } from "react";
import Map, { Marker, Source, Layer, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { type LocationTargetPoint } from "@/lib/db/schema";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

interface MapViewProps {
  center: [number, number]; // [lat, lng]
  zoom?: number;
  targetPoints: LocationTargetPoint[];
  userLocation?: { lat: number; lng: number } | null;
  selectedPointId?: string;
  onSelectPoint?: (pointId: string) => void;
  perPointCompletions?: Record<string, number>;
}

/** Generate a circle polygon (64 points) for a radius overlay. */
function makeCircleGeoJSON(
  lat: number,
  lng: number,
  radiusMeters: number
): GeoJSON.FeatureCollection {
  const N = 64;
  const R = 6371000;
  const coords: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const angle = (i / N) * 2 * Math.PI;
    const dLat = (radiusMeters / R) * Math.cos(angle) * (180 / Math.PI);
    const dLng =
      ((radiusMeters / R) * Math.sin(angle)) /
      Math.cos((lat * Math.PI) / 180) *
      (180 / Math.PI);
    coords.push([lng + dLng, lat + dLat]);
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [coords] },
        properties: {},
      },
    ],
  };
}

export function MapView({
  center,
  zoom = 14,
  targetPoints,
  userLocation,
  selectedPointId,
  onSelectPoint,
  perPointCompletions = {},
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);

  // Pan to user location when it arrives
  useEffect(() => {
    if (!userLocation) return;
    mapRef.current?.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: Math.max(zoom, 15),
      duration: 1000,
    });
  }, [userLocation, zoom]);

  return (
    <div className="rounded-xl overflow-hidden border w-full" style={{ height: 280 }}>
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: center[0],
          longitude: center[1],
          zoom,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        reuseMaps
        attributionControl={false}
      >
        {/* Radius circles for each target point */}
        {targetPoints
          .filter((p) => p.radiusMeters)
          .map((p) => {
            const isSelected = selectedPointId === p.id;
            return (
              <Source
                key={`radius-${p.id}`}
                type="geojson"
                data={makeCircleGeoJSON(p.lat, p.lng, p.radiusMeters!)}
              >
                <Layer
                  id={`radius-fill-${p.id}`}
                  type="fill"
                  paint={{
                    "fill-color": isSelected ? "#cc0000" : "#94a3b8",
                    "fill-opacity": 0.15,
                  }}
                />
                <Layer
                  id={`radius-border-${p.id}`}
                  type="line"
                  paint={{
                    "line-color": isSelected ? "#cc0000" : "#94a3b8",
                    "line-width": 1.5,
                    "line-dasharray": [3, 2],
                  }}
                />
              </Source>
            );
          })}

        {/* Target point markers */}
        {targetPoints.map((p) => {
          const exhausted =
            p.maxCompletions !== undefined &&
            (perPointCompletions[p.id] ?? 0) >= p.maxCompletions;
          const isSelected = selectedPointId === p.id;
          const color = exhausted ? "#94a3b8" : "#cc0000";

          return (
            <Marker
              key={p.id}
              latitude={p.lat}
              longitude={p.lng}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                if (!exhausted) onSelectPoint?.(p.id);
              }}
            >
              <div
                className="flex flex-col items-center cursor-pointer"
                style={{
                  transform: isSelected ? "scale(1.2)" : "scale(1)",
                  transition: "transform 0.15s",
                  filter: isSelected
                    ? "drop-shadow(0 2px 6px rgba(204,0,0,0.5))"
                    : "drop-shadow(0 1px 3px rgba(0,0,0,0.3))",
                }}
              >
                {/* Label bubble */}
                <div
                  style={{
                    background: color,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    marginBottom: 2,
                    maxWidth: 120,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.label}
                </div>
                {/* Pin dot */}
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: color,
                    border: "2px solid white",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                  }}
                />
                {/* Pin stem */}
                <div
                  style={{
                    width: 2,
                    height: 8,
                    background: color,
                    borderRadius: 1,
                  }}
                />
              </div>
            </Marker>
          );
        })}

        {/* User location — pulsing blue dot */}
        {userLocation && (
          <Marker
            latitude={userLocation.lat}
            longitude={userLocation.lng}
            anchor="center"
          >
            <div style={{ position: "relative", width: 20, height: 20 }}>
              {/* Pulse ring */}
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
    </div>
  );
}
