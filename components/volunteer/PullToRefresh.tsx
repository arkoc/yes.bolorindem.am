"use client";

import { useState, useEffect, useRef } from "react";

// Global pull-to-refresh for scrollable pages.
// Activates only when the page is scrolled to the very top and the user drags down.
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
        pr.current.distance = Math.min(dy, 100);
        setPullDistance(pr.current.distance);
      } else {
        pr.current.pulling = false;
        pr.current.distance = 0;
        setPullDistance(0);
      }
    };
    const onTouchEnd = () => {
      if (pr.current.distance >= 70) window.location.reload();
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

  return (
    <div
      style={{
        position: "fixed",
        top: pullDistance - 44,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "white",
        borderRadius: "50%",
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        opacity: Math.min(pullDistance / 70, 1),
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={pullDistance >= 70 ? "#16a34a" : "#6b7280"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transform: `rotate(${(pullDistance / 70) * 360}deg)` }}
      >
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 .49-4" />
      </svg>
    </div>
  );
}
