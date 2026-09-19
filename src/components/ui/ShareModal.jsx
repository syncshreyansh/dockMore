import React, { useState, useRef } from 'react';
import { X, Copy, Check, Link2, Globe, Shield } from 'lucide-react';
import SlideUpModal from './SlideUpModal';
import PillButton from './PillButton';
import { useToast } from '../../context/ToastContext';

export default function ShareModal({ isOpen, file, onClose }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const lastFileRef = useRef(file);
  if (file) {
    lastFileRef.current = file;
  }
  const currentFile = file || lastFileRef.current;

  if (!currentFile) return null;

  const shareUrl = `https://dockmore.app/share/f/${currentFile.id}`;

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (err) {
      
    }
    setCopied(true);
    showToast('Shareable link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="bg-surface rounded-3xl p-6 sm:p-8 max-w-md w-full flex flex-col gap-5 relative shadow-2xl"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-ink">Share File</h3>
          <p className="text-xs text-muted mt-0.5">
            Anyone with this link can view this file.
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

      <div className="p-3.5 rounded-2xl bg-white shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-track/30 flex items-center justify-center text-ink shrink-0">
          <Link2 className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-ink truncate">{currentFile.name}</h4>
          <p className="text-[11px] text-muted truncate mt-0.5">{currentFile.size} • {currentFile.provider.replace('-', ' ')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink">Shareable Link</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-white shadow-sm text-xs text-ink focus:outline-none select-all"
          />
          <PillButton
            variant="solid"
            size="sm"
            icon={copied ? Check : Copy}
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? 'Copied' : 'Copy'}
          </PillButton>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-1 text-xs text-muted">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-muted shrink-0" />
          <span>Public access via encrypted direct link</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-muted shrink-0" />
          <span>Cloud access permissions remain protected</span>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <PillButton variant="ghost" size="sm" onClick={onClose}>
          Done
        </PillButton>
      </div>
    </SlideUpModal>
  );
}

