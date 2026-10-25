import React from 'react';
import { X, GitCommit, ShieldCheck } from 'lucide-react';
import SlideUpModal from './SlideUpModal';
import PillButton from './PillButton';

export default function SnapshotHistoryModal({
  isOpen,
  project,
  snapshots = [],
  onClose,
}) {
  if (!project) return null;

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="bg-surface rounded-figma p-6 sm:p-8 max-w-2xl w-full flex flex-col gap-5 relative shadow-menu"
    >
      
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-lg font-semibold text-ink leading-tight">
              {project.name} Snapshots
            </h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-figma bg-track/40 text-ink">
              Showing {snapshots.length} of {project.snapshotCount ?? snapshots.length}
            </span>
          </div>
          <p className="text-xs text-muted font-mono mt-1">
            {project.path}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="group p-1.5 rounded-full hover:bg-black/5 text-muted hover:text-ink transition-colors duration-150 shrink-0"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
        </button>
      </div>

      
      <div className="flex items-center justify-between p-3 rounded-figma bg-white border border-track/40 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <GitCommit className="w-4 h-4 text-muted" />
            <span className="text-muted truncate">
            Stored in the local shadow repository
          </span>
        </div>
        <span className="text-[11px] font-semibold text-muted bg-track/40 px-2 py-0.5 rounded-figma shrink-0">
          Every {project.interval}m
        </span>
      </div>

      
      <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1 select-none sidebar-scroll">
        {snapshots.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted">
            No snapshots are recorded yet. Run dockmore watch from the local project directory.
          </div>
        ) : (
          snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="group flex items-center justify-between py-3 px-4 rounded-figma cursor-default select-none transition-all duration-150 ease-out bg-white hover:bg-[#303030] shadow-sm"
            >
              
              <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                <div className="w-9 h-9 rounded-lg bg-track/40 group-hover:bg-white/15 flex items-center justify-center text-ink group-hover:text-white shrink-0 transition-colors duration-150">
                  <GitCommit className="w-4 h-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-semibold text-ink group-hover:text-white truncate leading-tight transition-colors duration-150 font-mono">
                      {snapshot.hash ? `[${snapshot.hash}] ` : ''}{snapshot.summary}
                    </h5>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted group-hover:text-white/70 truncate transition-colors duration-150">
                      {snapshot.details}
                    </span>
                  </div>
                </div>
              </div>

              
              <div className="text-right shrink-0">
                <span className="text-xs text-muted group-hover:text-white/70 transition-colors duration-150">
                  {snapshot.timestamp}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-track/40 mt-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-ink/70 shrink-0" />
          <span>Invisible to normal git status / log</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PillButton variant="ghost" size="sm" onClick={onClose}>
            Close
          </PillButton>
          <span className="text-[11px] text-muted">Push from the CLI with <code>dockmore gitpush</code>.</span>
        </div>
      </div>
    </SlideUpModal>
  );
}
