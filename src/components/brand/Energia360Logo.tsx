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
        className="rounded-2xl bg-gradient-to-br from-[#0071E3] via-[#0077ED] to-[#28CD41] p-[1.5px] shadow-sm shrink-0"
      >
        <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center">
          <svg
            width={Math.round(size * 0.68)}
            height={Math.round(size * 0.68)}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Energia360"
          >
            <defs>
              <linearGradient
                id="appleRingGrad"
                x1="4"
                y1="4"
                x2="44"
                y2="44"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#0071E3" />
                <stop offset="100%" stopColor="#28CD41" />
              </linearGradient>
            </defs>
            <circle
              cx="24"
              cy="24"
              r="19"
              stroke="url(#appleRingGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="96 18"
              transform="rotate(-40 24 24)"
            />
            <path
              d="M26 11L16 25H23.5L21.5 37L32 22.5H24.5L26 11Z"
              fill="url(#appleRingGrad)"
            />
          </svg>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-tight text-[19px] leading-none text-[#1D1D1F]">
            Energia<span className="text-[#0071E3] font-bold">360</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0071E3]/10 text-[#0071E3]">
            RD
          </span>
        </div>
        {showTagline && (
          <span className="text-[11px] text-[#6E6E73] mt-0.5 font-normal">
            Tu energía. Tus datos. Tu control.
          </span>
        )}
      </div>
    </div>
  );
}
