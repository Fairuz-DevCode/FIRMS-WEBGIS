import React from 'react';
import { Map, Layers, Calendar } from 'lucide-react';
import { BasemapType } from '../constants/basemap.constants';

interface BottomRightControlsProps {
  basemap: BasemapType;
  onBasemapToggle: () => void;
  activePopover: 'layers' | 'calendar' | null;
  onTogglePopover: (popover: 'layers' | 'calendar') => void;
}

const btnBase =
  'flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border p-0 shadow-[0_4px_14px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all hover:-translate-y-0.5';
const btnIdle = 'border-slate-300 bg-white/95 text-slate-900 hover:border-green-600 hover:bg-slate-100';
const btnActive = 'border-green-600 bg-green-600 text-white shadow-[0_0_14px_rgba(22,163,74,0.35)]';

export const BottomRightControls: React.FC<BottomRightControlsProps> = ({
  onBasemapToggle,
  activePopover,
  onTogglePopover,
}) => {
  return (
    <div className="absolute bottom-6 left-6 z-[1000] flex select-none items-center gap-2.5">
      {/* 1. Basemap Switcher */}
      <button
        type="button"
        className={`${btnBase} ${btnIdle} !p-[3px]`}
        title="Ganti Basemap"
        onClick={onBasemapToggle}
      >
        <div className="flex h-full w-full items-center justify-center rounded-lg border border-white/90 bg-gradient-to-br from-sky-600 to-green-600">
          <Map className="h-5 w-5 text-white" />
        </div>
      </button>

      {/* 2. Layer & Overlay Popover Button */}
      <button
        type="button"
        className={`${btnBase} ${activePopover === 'layers' ? btnActive : btnIdle}`}
        title="Pengaturan Layer & Overlay"
        onClick={() => onTogglePopover('layers')}
      >
        <Layers className="h-5 w-5" />
      </button>

      {/* 3. Calendar & Date Filter Popover Button */}
      <button
        type="button"
        className={`${btnBase} ${activePopover === 'calendar' ? btnActive : btnIdle}`}
        title="Filter Kalender & Waktu"
        onClick={() => onTogglePopover('calendar')}
      >
        <Calendar className="h-5 w-5" />
      </button>
    </div>
  );
};

export default BottomRightControls;
