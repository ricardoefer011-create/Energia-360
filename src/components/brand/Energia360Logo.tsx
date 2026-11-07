"use client";

import React from "react";

interface Energia360LogoProps {
  size?: number;
  showTagline?: boolean;
}

export function Energia360Logo({
  size = 36,
  showTagline = false,
}: Energia360LogoProps) {
  return (
    <div className="flex items-center gap-3 select-none">
      <div
        style={{ width: size, height: size }}
        className="rounded-2xl bg-zinc-900 flex items-center justify-center shadow-xs shrink-0"
      >
        <svg
          width={Math.round(size * 0.62)}
          height={Math.round(size * 0.62)}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Energia360"
        >
          <circle
            cx="24"
            cy="24"
            r="19"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="96 18"
            transform="rotate(-40 24 24)"
          />
          <path
            d="M26 11L16 25H23.5L21.5 37L32 22.5H24.5L26 11Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-tight text-[19px] leading-none text-zinc-900">
            Energia<span className="font-bold text-zinc-500">360</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
            RD
          </span>
        </div>
        {showTagline && (
          <span className="text-[11px] text-zinc-500 mt-0.5 font-normal">
            Tu energía. Tus datos. Tu control.
          </span>
        )}
      </div>
    </div>
  );
}
