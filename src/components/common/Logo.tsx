import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'white';
}

export const Logo: React.FC<LogoProps> = ({ className = '', variant = 'full' }) => {
  const isWhite = variant === 'white';

  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 group select-none ${className}`}>
      {/* Emblem */}
      <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-[#F1FAF3] border border-[#8BCF9B]/40 group-hover:scale-105 transition-transform duration-200">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-[#237A3B]"
        >
          {/* Nest leaf & healthcare cross motif */}
          <path
            d="M16 3C16 3 8 7 8 16C8 22 12.5 26.5 16 29C19.5 26.5 24 22 24 16C24 7 16 3 16 3Z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="#8BCF9B"
            fillOpacity="0.25"
          />
          <path
            d="M16 11V21M11 16H21"
            stroke="#237A3B"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Brand Text */}
      {variant !== 'compact' && (
        <div className="flex flex-col">
          <span
            className={`font-bold tracking-tight text-base leading-tight ${
              isWhite ? 'text-white' : 'text-[#1F2937]'
            }`}
          >
            NEST CARE
          </span>
          <span
            className={`text-[10px] tracking-widest uppercase font-semibold -mt-0.5 ${
              isWhite ? 'text-[#8BCF9B]' : 'text-[#237A3B]'
            }`}
          >
            CONNECT
          </span>
        </div>
      )}
    </Link>
  );
};
