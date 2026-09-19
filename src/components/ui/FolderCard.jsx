import React, { useState, useRef, useEffect } from 'react';
import { Folder, MoreVertical, FolderOpen, Edit3, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RenameModal from './RenameModal';
import ConfirmModal from './ConfirmModal';
import { useFiles } from '../../hooks/useFiles';
import { useToast } from '../../context/ToastContext';


export default function FolderCard({ folder, onClick, className = '' }) {
  const navigate = useNavigate();
  const { renameFolder, deleteFolder } = useFiles();
  const { showToast } = useToast();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  if (!folder) return null;

  const { name = 'FOLDER' } = folder;

  const handleCardClick = () => {
    if (onClick) {
      onClick(folder);
    } else {
      navigate(`/files?folder=${folder.id}`);
    }
  };

  const handleRename = (newName) => {
    renameFolder(folder.id, newName);
    showToast(`Renamed folder to "${newName.toUpperCase()}"`, 'success');
  };

  const handleDelete = () => {
    deleteFolder(folder.id);
    setShowDeleteConfirm(false);
    showToast(`Deleted folder "${folder.name}"`, 'info');
  };

  return (
    <>
      <div className={`group relative pt-4 cursor-pointer select-none ${className}`}>
        
        <div
          className="absolute inset-x-3 top-0 h-11 bg-ink group-hover:bg-white rounded-figma z-0 transition-colors duration-150 ease-out shadow-sm"
          aria-hidden="true"
        />

        
        <div
          onClick={handleCardClick}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen(true);
          }}
          className="relative z-10 bg-white group-hover:bg-ink rounded-figma p-5 flex items-center justify-between min-h-[86px] shadow-sm transition-colors duration-150 ease-out"
        >
          
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-ink group-hover:text-white shrink-0 transition-colors duration-150">
              <Folder className="w-5 h-5 stroke-[1.75]" />
            </div>
            <span className="font-sans font-bold text-sm text-ink group-hover:text-white uppercase tracking-wider truncate transition-colors duration-150">
              {name}
            </span>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="p-1 rounded-full text-muted group-hover:text-white/80 hover:!text-white hover:!bg-white/15 transition-colors duration-150"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              aria-label="Folder options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 bg-white border border-track/60 shadow-[0_4px_24px_rgba(0,0,0,0.14)] rounded-2xl p-1.5 min-w-[140px] z-50 flex flex-col gap-1 text-ink"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(`/files?folder=${folder.id}`);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 transition-colors text-left"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-muted" />
                  <span>Open</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowRename(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 transition-colors text-left"
                >
                  <Edit3 className="w-3.5 h-3.5 text-muted" />
                  <span>Rename</span>
                </button>

                <div className="border-t border-track/40 my-0.5" />

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <RenameModal
        isOpen={showRename}
        initialName={folder.name}
        title="Rename Folder"
        onRename={handleRename}
        onClose={() => setShowRename(false)}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Folder"
        message={`Are you sure you want to delete "${folder.name}"? Files inside will be unorganized.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
