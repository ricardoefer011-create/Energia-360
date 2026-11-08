"use client";

import React from "react";

interface Energia360LogoProps {
  className?: string;
  size?: number;
  showTagline?: boolean;
  variant?: "dark" | "light";
}

/**
 * Pin de rombo entrelazado estilo GrupaMar (#03A9EC + #091197)
 */
export function Energia360DiamondPin({ active = false }: { active?: boolean }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 38 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <path
        d="M20.5561 33.3556C19.6969 34.2148 18.3073 34.2148 17.4481 33.3556L4.64439 20.5543C3.7852 19.6951 3.7852 18.3055 4.64439 17.4463L17.4481 4.64259C18.3073 3.7858 19.6969 3.7858 20.5561 4.64259L33.3598 17.4439C34.219 18.3031 34.219 19.6927 33.3598 20.5519L20.5561 33.3556Z"
        fill={active ? "#03A9EC" : "#091197"}
      />
      <path
        d="M12.8477 20.7275C13.1932 20.382 13.7545 20.382 14.1025 20.7275L19.2676 25.8916C19.6131 26.2372 19.6131 26.7989 19.2676 27.1445L14.1025 32.3096C13.7545 32.6549 13.1932 32.6551 12.8477 32.3096L7.68359 27.1445C7.33804 26.7989 7.33804 26.2372 7.68359 25.8916L12.8477 20.7275ZM20.2393 13.3359C20.5849 12.9903 21.1466 12.9903 21.4922 13.3359L26.6592 18.5V18.5029C27.0047 18.8485 27.0047 19.4093 26.6592 19.7549L21.4922 24.9199C21.1466 25.2679 20.5848 25.2679 20.2393 24.9199L15.0752 19.7549C14.7297 19.4093 14.7297 18.8485 15.0752 18.5029L20.2393 13.3359ZM12.8721 5.96777C13.2201 5.62221 13.779 5.62222 14.127 5.96777L19.292 11.1318C19.6375 11.4773 19.6373 12.0392 19.292 12.3848L14.127 17.5498C13.779 17.8953 13.2176 17.8953 12.8721 17.5498L7.70703 12.3848C7.36166 12.0392 7.36148 11.4774 7.70703 11.1318L12.8721 5.96777Z"
        fill={active ? "#091197" : "#FFFFFF"}
      />
    </svg>
  );
}

/**
 * Isotipo geométrico inspirado en el emblema de diamantes entrelazados de GrupaMar
 * (#091197 Royal Blue + #03A9EC Cyan Blue)
 */
export function Energia360Logo({
  className = "",
  size = 44,
  showTagline = false,
  variant = "light",
}: Energia360LogoProps) {
  const isDarkBg = variant === "dark";

  return (
    <div className={`inline-flex items-center gap-3.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ENERGIA360 Logo"
        className="shrink-0"
      >
        <rect
          width="48"
          height="48"
          rx="9"
          fill={isDarkBg ? "#FFFFFF" : "#091197"}
        />
        {/* Rombo exterior #03A9EC estilo GrupaMar */}
        <path
          d="M25.5561 38.3556C24.6969 39.2148 23.3073 39.2148 22.4481 38.3556L9.64439 25.5543C8.7852 24.6951 8.7852 23.3055 9.64439 22.4463L22.4481 9.64259C23.3073 8.7858 24.6969 8.7858 25.5561 9.64259L38.3598 22.4439C39.219 23.3031 39.219 24.6927 38.3598 25.5519L25.5561 38.3556Z"
          fill="#03A9EC"
        />
        {/* Tres nodos energéticos en rombo #091197 */}
        <path
          d="M17.8477 25.7275C18.1932 25.382 18.7545 25.382 19.1025 25.7275L24.2676 30.8916C24.6131 31.2372 24.6131 31.7989 24.2676 32.1445L19.1025 37.3096C18.7545 37.6549 18.1932 37.6551 17.8477 37.3096L12.6836 32.1445C12.338 31.7989 12.338 31.2372 12.6836 30.8916L17.8477 25.7275ZM25.2393 18.3359C25.5849 17.9903 26.1466 17.9903 26.4922 18.3359L31.6592 23.5V23.5029C32.0047 23.8485 32.0047 24.4093 31.6592 24.7549L26.4922 29.9199C26.1466 30.2679 25.5848 30.2679 25.2393 29.9199L20.0752 24.7549C19.7297 24.4093 19.7297 23.8485 20.0752 23.5029L25.2393 18.3359ZM17.8721 10.9678C18.2201 10.6222 18.779 10.6222 19.127 10.9678L24.292 16.1318C24.6375 16.4773 24.6373 17.0392 24.292 17.3848L19.127 22.5498C18.779 22.8953 18.2176 22.8953 17.8721 22.5498L12.707 17.3848C12.3617 17.0392 12.3615 11.4774 12.707 16.1318L17.8721 10.9678Z"
          fill="#091197"
        />
      </svg>

      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-1">
          <span
            className={`font-extrabold tracking-tight text-xl sm:text-2xl ${
              isDarkBg ? "text-white" : "text-[#091197]"
            }`}
          >
            ENERGIA
          </span>
          <span className="font-normal text-xl sm:text-2xl text-[#03A9EC]">
            360
          </span>
        </div>
        {showTagline && (
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.18em] mt-0.5 ${
              isDarkBg ? "text-white/75" : "text-[#091197]/70"
            }`}
          >
            Ingeniería &amp; Gestión SIE · RD
          </span>
        )}
      </div>
    </div>
  );
}
