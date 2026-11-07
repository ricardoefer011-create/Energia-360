"use client";

import React from "react";

interface Energia360LogoProps {
  className?: string;
  size?: number;
  showTagline?: boolean;
  variant?: "dark" | "light";
}

export function Energia360Logo({
  className = "",
  size = 38,
  showTagline = false,
  variant = "dark",
}: Energia360LogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div
        style={{ width: size, height: size }}
        className="relative rounded-[14px] hover:rounded-[11px] bg-[#5865F2] flex items-center justify-center shadow-md shadow-[#5865F2]/30 transition-all duration-200 group"
      >
        <svg
          width={size * 0.62}
          height={size * 0.62}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="ENERGIA360 Logo"
          className="group-hover:scale-110 transition-transform duration-200"
        >
          {/* Silueta amigable tipo control/mascot de energía inspirado en Clyde de Discord */}
          <path
            d="M14 20C14 14.4772 18.4772 10 24 10H40C45.5228 10 50 14.4772 50 20V38C50 44.6274 44.6274 50 38 50H34L28 56V50H24C18.4772 50 14 45.5228 14 40V20Z"
            fill="white"
            fillOpacity="0.18"
          />
          {/* Rayo jovial central */}
          <path
            d="M35.5 11L19 34.5H31.5L28.5 53L45 29.5H32.5L35.5 11Z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Destello verde Discord */}
          <circle cx="48" cy="16" r="5" fill="#57F287" />
        </svg>
      </div>

      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-black tracking-tight text-lg sm:text-xl ${
              variant === "light" ? "text-[#23272A]" : "text-white"
            }`}
          >
            ENERGIA
          </span>
          <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-[#5865F2] text-white shadow-2xs">
            360
          </span>
        </div>
        {showTagline && (
          <span
            className={`text-[11px] font-semibold tracking-tight mt-0.5 ${
              variant === "light" ? "text-[#4E5058]" : "text-[#B5BAC1]"
            }`}
          >
            República Dominicana
          </span>
        )}
      </div>
    </div>
  );
}
