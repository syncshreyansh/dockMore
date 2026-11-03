import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

const INTERVALS = [5, 10, 15, 20, 25, 30, 60];

export default function SyncIntervalDropdown({ project, disabled, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const currentInterval = Number(project.interval) || 15;
  const options = [...new Set([...INTERVALS, currentInterval])].sort((a, b) => a - b);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex flex-shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Sync interval for ${project.name}: every ${currentInterval} minutes`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 rounded-full bg-transparent px-2 py-1 text-sm font-medium text-[#777777] transition-colors hover:bg-white/70 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:cursor-wait disabled:opacity-60"
      >
        Every {currentInterval} min
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      <div
        role="menu"
        aria-label={`Sync interval for ${project.name}`}
        aria-hidden={!open}
        className={`absolute left-0 top-full z-[60] mt-2 min-w-[148px] origin-top-left rounded-figma border border-track bg-white p-1 shadow-menu transition-all duration-200 ease-out motion-reduce:transition-none ${open ? 'visible translate-y-0 scale-100 opacity-100' : 'invisible -translate-y-1 scale-[0.98] opacity-0 pointer-events-none'}`}
      >
        {options.map((minutes) => {
          const selected = minutes === currentInterval;
          return (
            <button
              key={minutes}
              type="button"
              role="menuitemradio"
              aria-checked={selected}
              tabIndex={open ? 0 : -1}
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
                if (!selected) onChange?.(project, minutes);
              }}
              className={`flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${selected ? 'bg-ink text-white' : 'bg-transparent text-ink hover:bg-[#E9E9E9]'}`}
            >
              <span>Every {minutes} min</span>
              {selected && <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
