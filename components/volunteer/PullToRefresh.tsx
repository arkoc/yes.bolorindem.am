"use client";

import { useState, useEffect, useRef } from "react";

const THRESHOLD = 90; // px needed to trigger refresh
const MAX_PULL = 130;

export function PullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0);
  const pr = useRef({ startY: 0, pulling: false, distance: 0 });

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      pr.current.startY = e.touches[0].clientY;
      pr.current.pulling = window.scrollY === 0;
      pr.current.distance = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!pr.current.pulling) return;
      const dy = e.touches[0].clientY - pr.current.startY;
      if (dy > 0) {
        pr.current.distance = Math.min(dy, MAX_PULL);
        setPullDistance(pr.current.distance);
      } else {
        pr.current.pulling = false;
        pr.current.distance = 0;
        setPullDistance(0);
      }
    };
    const onTouchEnd = () => {
      if (pr.current.distance >= THRESHOLD) window.location.reload();
      pr.current.pulling = false;
      pr.current.distance = 0;
      setPullDistance(0);
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  if (pullDistance === 0) return null;

  const ready = pullDistance >= THRESHOLD;
  // Wind-up rotation: 0→270deg as you pull, then spins continuously when ready
  const windUpDeg = (Math.min(pullDistance, THRESHOLD) / THRESHOLD) * 270;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: "50%",
        // Slide in from above: starts off-screen, reaches comfortable position at THRESHOLD
        transform: `translateX(-50%) translateY(${Math.max(10, pullDistance * 0.55 - 10)}px)`,
        zIndex: 9999,
        background: "white",
        borderRadius: "50%",
        width: 40,
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: ready
          ? "0 4px 16px rgba(22,163,74,0.3)"
          : "0 2px 10px rgba(0,0,0,0.15)",
        opacity: Math.min((pullDistance / THRESHOLD) * 1.4, 1),
        transition: "box-shadow 0.2s",
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={ready ? "#16a34a" : "#6b7280"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        // Wind-up while pulling; animate-spin once threshold reached
        className={ready ? "animate-spin" : undefined}
        style={ready ? undefined : { transform: `rotate(${windUpDeg}deg)` }}
      >
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 .49-4" />
      </svg>
    </div>
  );
}
