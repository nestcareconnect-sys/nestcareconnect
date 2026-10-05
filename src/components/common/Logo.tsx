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
        <img
          src="/logo-icon.svg"
          alt="Nest Care Connect"
          className="w-6 h-6 object-contain"
        />
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
