"use client";

import React from "react";

interface Energia360LogoProps {
  size?: number;
  showTagline?: boolean;
}

export function Energia360Logo({
  size = 38,
  showTagline = false,
}: Energia360LogoProps) {
  return (
    <div className="flex items-center gap-3 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm"
        aria-label="Logotipo ENERGIA360"
      >
        <defs>
          <linearGradient
            id="e360Ring"
            x1="10"
            y1="10"
            x2="110"
            y2="110"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="55%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
          <linearGradient
            id="e360Pulse"
            x1="36"
            y1="26"
            x2="84"
            y2="94"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        <rect
          width="120"
          height="120"
          rx="26"
          fill="#060D1E"
          stroke="#1E293B"
          strokeWidth="3"
        />
        {/* Anillo orbital de 360 grados con telemetría circular */}
        <circle
          cx="60"
          cy="60"
          r="41"
          stroke="url(#e360Ring)"
          strokeWidth="7"
          strokeDasharray="205 26"
          strokeLinecap="round"
          transform="rotate(-40 60 60)"
        />
        <circle
          cx="60"
          cy="60"
          r="29"
          stroke="#1E293B"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
        {/* Nodos de control */}
        <circle cx="60" cy="19" r="4.5" fill="#38BDF8" />
        <circle cx="95" cy="81" r="4.5" fill="#10B981" />
        {/* Símbolo central de vector energético y análisis */}
        <path
          d="M64 31L43 62H59L55 89L77 56H61L64 31Z"
          fill="url(#e360Pulse)"
        />
      </svg>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold tracking-tight text-lg leading-none">
            ENERGIA<span className="text-sky-500">360</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            RD
          </span>
        </div>
        {showTagline && (
          <span className="text-[11px] text-slate-400 mt-0.5">
            Tu energía. Tus datos. Tu control.
          </span>
        )}
      </div>
    </div>
  );
}

