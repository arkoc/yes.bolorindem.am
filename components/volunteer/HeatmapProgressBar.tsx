"use client";

import { useState } from "react";
import L, { t } from "@/lib/labels";

interface HeatmapProgressBarProps {
  claimed: number;
  total: number;
  userClaimed: number;
  userPoints: number;
  dailyCount: number;
}

const COMPLETION_BONUS = 10_000;
const DAILY_LIMIT = 10;

export function HeatmapProgressBar({ claimed, total, userClaimed, userPoints, dailyCount }: HeatmapProgressBarProps) {
  const [showInfo, setShowInfo] = useState(false);
  const pct = total > 0 ? Math.round((claimed / total) * 100) : 0;
  const estimatedBonus =
    total > 0 && userClaimed > 0
      ? Math.round((userClaimed / total) * COMPLETION_BONUS)
      : null;

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        right: 12,
        zIndex: 10,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(8px)",
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
        maxWidth: "min(340px, calc(100vw - 24px))",
        margin: "0 auto",
      }}
    >
      {/* Title row */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold">{L.heatmap.sloganTitle}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t(L.heatmap.progressDots, { claimed, total })}</span>
          <button
            onClick={() => setShowInfo((v) => !v)}
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: showInfo ? "#1d4ed8" : "#3b82f6",
              color: "white",
              fontSize: 11,
              fontWeight: 700,
              lineHeight: "18px",
              textAlign: "center",
              flexShrink: 0,
              border: "none",
              cursor: "pointer",
            }}
          >
            {showInfo ? "✕" : "i"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 3, background: "#e5e7eb", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "#cc0000",
            borderRadius: 3,
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* Completion bonus + user stats */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-muted-foreground">
          🏆{" "}
          <span className="font-medium text-foreground">
            +{COMPLETION_BONUS.toLocaleString()}
          </span>{" "}
          {L.heatmap.completionBonusSuffix}
        </span>
        {userClaimed > 0 && (
          <span className="text-xs text-muted-foreground">
            {L.heatmap.userStatPrefix}{" "}
            <span className="font-medium text-foreground">{t(L.heatmap.userStatPoints, { points: userPoints, dots: userClaimed })}</span>
            {estimatedBonus !== null && (
              <span className="text-amber-600 font-medium"> {t(L.heatmap.userStatBonusEstimate, { bonus: estimatedBonus })}</span>
            )}
          </span>
        )}
      </div>

      {/* Daily limit indicator */}
      <div className="mt-2 pt-2" style={{ borderTop: "1px solid #e5e7eb" }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{t(L.heatmap.dailyLimitStat, { used: dailyCount })}</span>
          <span className="text-xs font-medium" style={{ color: dailyCount >= DAILY_LIMIT ? "#cc0000" : dailyCount >= 7 ? "#d97706" : "#16a34a" }}>
            {DAILY_LIMIT - dailyCount > 0 ? `${DAILY_LIMIT - dailyCount} մնաց` : "սպառված"}
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: "#e5e7eb", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, (dailyCount / DAILY_LIMIT) * 100)}%`,
              background: dailyCount >= DAILY_LIMIT ? "#cc0000" : dailyCount >= 7 ? "#d97706" : "#16a34a",
              borderRadius: 2,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {/* Expandable explanation */}
      {showInfo && (
        <div
          className="mt-2 pt-2 text-xs text-muted-foreground space-y-1.5"
          style={{ borderTop: "1px solid #e5e7eb" }}
        >
          <p>
            <span className="font-medium text-foreground">{L.heatmap.infoMapTitle}</span>{" "}
            — {L.heatmap.infoMapText}
          </p>
          <p>
            <span className="font-medium text-foreground">{L.heatmap.infoDotPointsTitle}</span>{" "}
            — {t(L.heatmap.infoDotPointsText, { min: 10, max: 200, threshold: 2000 })}
          </p>
          <p>
            <span className="font-medium text-foreground">{t(L.heatmap.infoBonusTitle, { bonus: COMPLETION_BONUS.toLocaleString() })}</span>{" "}
            — {L.heatmap.infoBonusText}{" "}
            {estimatedBonus !== null
              ? t(L.heatmap.infoBonusYourShare, { bonus: estimatedBonus })
              : L.heatmap.infoBonusIncentive}
          </p>
        </div>
      )}
    </div>
  );
}
