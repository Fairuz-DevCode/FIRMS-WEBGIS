import React from 'react';
import { Sprout} from 'lucide-react';
import { ResearchModule } from '../../shared/constants/researchModules.constants';

interface SipongiHeaderProps {
  selectedModule: ResearchModule;
  onModuleChange: (module: ResearchModule) => void;
}

const actionBtn =
  'flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition-all hover:border-green-300 hover:bg-white/25';

export const SipongiHeader: React.FC<SipongiHeaderProps> = ({ selectedModule, onModuleChange }) => {
  return (
    <header className="z-[1100] flex h-16 shrink-0 select-none items-center justify-between border-b border-white/15 bg-gradient-to-r from-prims-900 via-prims-700 to-prims-800 px-[18px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
      {/* Left Section: Logo & Research Title */}
      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/35 bg-white/20 text-green-300">
            <Sprout className="h-[18px] w-[18px]" />
          </div>
          <span className="font-display text-[1.3rem] font-extrabold tracking-wider text-white">
            PRIMS
          </span>
        </div>

        <div className="mx-1 h-6 w-px bg-white/25" />

        <div className="flex items-center gap-3">
          <h1 className="whitespace-nowrap font-display text-[0.98rem] font-semibold text-green-50">
            Penelitian Spasial Pemantauan Gambut & Hidrologi
          </h1>
        </div>
      </div>
    </header>
  );
};

export default SipongiHeader;
