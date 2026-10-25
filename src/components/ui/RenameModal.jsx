import React, { useState, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';
import SlideUpModal from './SlideUpModal';
import PillButton from './PillButton';

export default function RenameModal({
  isOpen,
  initialName = '',
  title = 'Rename Item',
  onRename,
  onClose,
}) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (initialName) {
      setName(initialName);
    }
  }, [initialName, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onRename(name.trim());
    onClose();
  };

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="bg-surface rounded-figma p-6 sm:p-8 max-w-md w-full flex flex-col gap-5 relative shadow-menu"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-figma bg-track/30 flex items-center justify-center text-ink shrink-0">
            <Edit3 className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">
            New Name
          </label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-figma bg-white shadow-sm text-sm text-ink focus:outline-none focus:ring-1 focus:ring-ink/20"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3">
          <PillButton variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton variant="solid" size="sm" type="submit">
            Save Changes
          </PillButton>
        </div>
      </form>
    </SlideUpModal>
  );
}

