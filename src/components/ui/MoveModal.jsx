import React, { useState } from 'react';
import { X, Folder, FolderInput, HardDrive } from 'lucide-react';
import SlideUpModal from './SlideUpModal';
import PillButton from './PillButton';
import { useFiles } from '../../hooks/useFiles';
import ProviderIcon from './ProviderIcon';

export default function MoveModal({
  isOpen,
  fileCount = 1,
  currentFolderId = null,
  onMove,
  onClose,
}) {
  const { folders } = useFiles();
  const [selectedFolderId, setSelectedFolderId] = useState(currentFolderId || 'root');

  const handleSubmit = (e) => {
    e.preventDefault();
    const targetFolderId = selectedFolderId === 'root' ? null : selectedFolderId;
    const targetFolder = folders.find((f) => f.id === targetFolderId);
    const newPath = targetFolder ? `/${targetFolder.name}/` : '/';
    onMove(targetFolderId, newPath);
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
            <FolderInput className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink">Move {fileCount > 1 ? `${fileCount} Items` : 'Item'}</h3>
            <p className="text-xs text-muted mt-0.5">Select a destination folder</p>
          </div>
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
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          
          <button
            type="button"
            onClick={() => setSelectedFolderId('root')}
            className={`flex items-center justify-between p-3 rounded-figma text-left transition-colors duration-150 ${
              selectedFolderId === 'root'
                ? 'bg-ink text-white shadow-sm'
                : 'bg-white text-ink shadow-sm hover:bg-black/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <HardDrive className={`w-4 h-4 ${selectedFolderId === 'root' ? 'text-white' : 'text-muted'}`} />
              <div>
                <span className="text-xs font-semibold block">My Drive</span>
                <span className={`text-[10px] ${selectedFolderId === 'root' ? 'text-white/80' : 'text-muted'}`}>
                  Move to the top of this account
                </span>
              </div>
            </div>
            {selectedFolderId === 'root' && (
              <span className="text-[10px] uppercase font-semibold bg-white/20 px-2 py-0.5 rounded-figma">
                Selected
              </span>
            )}
          </button>

          
          {folders.map((folder) => {
            const isSelected = selectedFolderId === folder.id;
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => setSelectedFolderId(folder.id)}
                className={`flex items-center justify-between p-3 rounded-figma text-left transition-colors duration-150 ${
                  isSelected
                    ? 'bg-ink text-white shadow-sm'
                    : 'bg-white text-ink shadow-sm hover:bg-black/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Folder className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-muted'}`} />
                  <div>
                    <span className="text-xs font-semibold block uppercase">{folder.name}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-muted'}`}>
                      {folder.providerName}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <span className="text-[10px] uppercase font-semibold bg-white/20 px-2 py-0.5 rounded-figma">
                    Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3">
          <PillButton variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton variant="solid" size="sm" type="submit">
            Move Here
          </PillButton>
        </div>
      </form>
    </SlideUpModal>
  );
}
