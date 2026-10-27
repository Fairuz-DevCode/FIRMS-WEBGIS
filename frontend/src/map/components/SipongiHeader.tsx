import React from 'react';
import { Sprout } from 'lucide-react';

interface SipongiHeaderProps {
  children?: React.ReactNode;
}

export const SipongiHeader: React.FC<SipongiHeaderProps> = ({ children }) => {
  return (
    <header className="z-[1100] flex h-16 shrink-0 select-none items-center justify-between border-b border-white/15 bg-gradient-to-r from-prims-900 via-prims-700 to-prims-800 px-5 text-white shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
      {/* Left Section: Logo & Research Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/35 bg-white/20 text-green-300">
            <Sprout className="h-[18px] w-[18px]" />
          </div>
          <span className="font-display text-[1.25rem] font-extrabold tracking-wider text-white">
            PRIMS
          </span>
        </div>

        <div className="mx-1 h-6 w-px bg-white/25 hidden lg:block" />

        <div className="hidden lg:flex items-center gap-2">
          <h1 className="whitespace-nowrap font-display text-[0.92rem] font-semibold text-green-50">
            Pemantauan Gambut & Analisis Data Karhutla
          </h1>
        </div>
      </div>

      {/* Right Section: Navbar Dropdowns */}
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </header>
  );
};

export default SipongiHeader;
