import React, { useState } from 'react';
import { X, FolderGit2, ShieldCheck, Clock } from 'lucide-react';
import SlideUpModal from './SlideUpModal';
import PillButton from './PillButton';
import { useToast } from '../../context/ToastContext';

const INTERVAL_PRESETS = [10, 15, 20, 30];

export default function TrackProjectModal({ isOpen, onClose, onTrackProject }) {
  const { showToast } = useToast();

  const [projectName, setProjectName] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [interval, setInterval] = useState(15);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      showToast('Enter a project name', 'error');
      return;
    }

    onTrackProject({
      name: projectName.trim(),
      path: folderPath.trim() || `~/projects/${projectName.trim().toLowerCase().replace(/\s+/g, '-')}`,
      interval: Number(interval) || 15,
    });

    
    setProjectName('');
    setFolderPath('');
    setInterval(15);
    onClose();
  };

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="bg-surface rounded-figma p-6 sm:p-8 max-w-lg w-full flex flex-col gap-5 relative shadow-menu"
    >
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-ink">Track New Project</h3>
          <p className="text-xs text-muted mt-0.5">
            Track changes to a project with local snapshots.
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

      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">
            Project Name
          </label>
          <input
            type="text"
            placeholder="e.g. dockmore-cli or mobile-app"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-figma bg-white shadow-sm text-sm text-ink focus:outline-none focus:ring-1 focus:ring-ink/20"
          />
        </div>

        
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">
            Local Folder Path
          </label>
          <input
            type="text"
            placeholder={
              projectName
                ? `~/projects/${projectName.toLowerCase().replace(/\s+/g, '-')}`
                : '~/projects/my-repo'
            }
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            className="w-full px-4 py-2.5 rounded-figma bg-white shadow-sm text-sm text-ink focus:outline-none focus:ring-1 focus:ring-ink/20 font-mono text-xs"
          />
          <span className="text-[11px] text-muted mt-1 block">
            The folder containing your project on this computer.
          </span>
        </div>

        
        <p className="p-3 bg-white rounded-figma text-xs text-muted border border-track/40">
          Snapshots stay in the local shadow repository. Start and manage the watcher with the DockMore CLI.
        </p>

        
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted" />
              Snapshot Interval
            </label>
            <span className="text-xs font-semibold text-ink bg-track/40 px-2.5 py-0.5 rounded-figma">
              Every {interval} minutes
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            {INTERVAL_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setInterval(p)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-figma border transition-colors ${
                  interval === p
                    ? 'bg-ink text-white border-ink'
                    : 'bg-white text-ink border-track/60 hover:bg-black/5'
                }`}
              >
                {p}m
              </button>
            ))}
          </div>

          <input
            type="range"
            min="10"
            max="30"
            step="1"
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="w-full h-1.5 bg-track rounded-lg appearance-none cursor-pointer accent-ink"
          />
          <div className="flex justify-between text-[10px] text-muted mt-1 font-mono">
            <span>10 min (fine-grained)</span>
            <span>30 min (lighter)</span>
          </div>
        </div>

        
        <div className="flex items-center gap-2 text-[11px] text-muted bg-track/30 p-3 rounded-figma mt-1">
          <ShieldCheck className="w-4 h-4 text-ink shrink-0" />
          <span>
            Snapshots are captured to an isolated shadow git tree (<code className="font-mono text-ink">--git-dir</code>). Your real <code className="font-mono text-ink">git status</code> and GitHub commit history remain 100% clean.
          </span>
        </div>

        
        <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-track/40">
          <PillButton variant="ghost" size="md" onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton variant="solid" size="md" type="submit" icon={FolderGit2}>
            Track Project
          </PillButton>
        </div>
      </form>
    </SlideUpModal>
  );
}
