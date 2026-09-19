import React from 'react';
import { X, GitCommit, Cloud, ShieldCheck, CheckCircle2 } from 'lucide-react';
import SlideUpModal from './SlideUpModal';
import PillButton from './PillButton';
import ProviderIcon from './ProviderIcon';

export default function SnapshotHistoryModal({
  isOpen,
  project,
  snapshots = [],
  onClose,
  onPushToGitHub,
}) {
  if (!project) return null;

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="bg-surface rounded-3xl p-6 sm:p-8 max-w-2xl w-full flex flex-col gap-5 relative shadow-2xl"
    >
      
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-ink leading-tight">
              {project.name} Snapshots
            </h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-figma bg-track/40 text-ink">
              {snapshots.length} total
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

      
      <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-track/40 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <ProviderIcon provider={project.provider} size="xs" />
          <span className="text-muted truncate">
            Mirrored to <strong className="text-ink">{project.accountEmail}</strong>
          </span>
        </div>
        <span className="text-[11px] font-semibold text-muted bg-track/40 px-2 py-0.5 rounded-figma shrink-0">
          Every {project.interval}m
        </span>
      </div>

      
      <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1 select-none sidebar-scroll">
        {snapshots.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted">
            No snapshots recorded yet. Watch process will create one automatically.
          </div>
        ) : (
          snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="group flex items-center justify-between py-3 px-4 rounded-xl cursor-default select-none transition-all duration-150 ease-out bg-white hover:bg-[#303030] shadow-sm"
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
                    {snapshot.mirroredToCloud && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 group-hover:bg-emerald-900/60 group-hover:text-emerald-200 px-1.5 py-0.5 rounded-figma">
                        <Cloud className="w-2.5 h-2.5" />
                        Mirrored
                      </span>
                    )}
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

      
      <div className="flex items-center justify-between pt-3 border-t border-track/40 mt-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-ink/70 shrink-0" />
          <span>Invisible to normal git status / log</span>
        </div>

        <div className="flex items-center gap-2">
          <PillButton variant="ghost" size="sm" onClick={onClose}>
            Close
          </PillButton>
          {onPushToGitHub && (
            <PillButton
              variant="solid"
              size="sm"
              onClick={() => {
                onClose();
                onPushToGitHub(project);
              }}
            >
              Push to GitHub
            </PillButton>
          )}
        </div>
      </div>
    </SlideUpModal>
  );
}
