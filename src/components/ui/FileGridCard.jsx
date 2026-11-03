import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Check, FolderOpen, Edit3, Trash2, Download, Share2 } from 'lucide-react';
import FileThumbnail from './FileThumbnail';

export default function FileGridCard({
  file,
  isSelected = false,
  onToggleSelect,
  onAction,
  onSelect,
  className = '',
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);


  const { name, path, size } = file || {};

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

  
  if (!file) return null;

  return (
    <div
      onClick={onSelect}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpen(true);
      }}
      className={`dm-media-tile group relative bg-white rounded-figma cursor-pointer select-none transition-colors duration-150 flex flex-col overflow-visible border border-transparent text-left ${
        isSelected ? 'ring-1 ring-ink border-ink' : ''
      } ${className}`}
    >
      
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect && onToggleSelect(file.id);
        }}
        className={`absolute top-3 left-3 w-5 h-5 rounded-md border flex items-center justify-center transition-colors duration-150 z-20 shadow-sm ${
          isSelected
            ? 'bg-ink border-ink text-white'
            : 'bg-white/90 border-track/60 text-transparent hover:border-ink/50 opacity-0 group-hover:opacity-100'
        }`}
      >
        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
      </div>

      
      <FileThumbnail file={file} />

      <div className="p-3 flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{name}</p>
          <p className="mt-1 truncate text-xs text-muted">{path || '/'} {'\u00b7'} {size}</p>
        </div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-black/5 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 bottom-full mb-1 bg-white border border-track/60 shadow-menu rounded-figma p-1.5 min-w-[150px] z-50 flex flex-col gap-1 text-ink"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction && onAction('preview', file);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-figma text-xs font-semibold hover:bg-black/5 text-left"
              >
                <FolderOpen className="w-3.5 h-3.5 text-muted" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction && onAction('download', file);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-figma text-xs font-semibold hover:bg-black/5 text-left"
              >
                <Download className="w-3.5 h-3.5 text-muted" />
                <span>Download</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction && onAction('share', file);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-figma text-xs font-semibold hover:bg-black/5 text-left"
              >
                <Share2 className="w-3.5 h-3.5 text-muted" />
                <span>Share</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction && onAction('rename', file);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-figma text-xs font-semibold hover:bg-black/5 text-left"
              >
                <Edit3 className="w-3.5 h-3.5 text-muted" />
                <span>Rename</span>
              </button>
              <div className="border-t border-track/40 my-0.5" />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction && onAction('delete', file);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-figma text-xs font-semibold text-red-600 hover:bg-sidebar text-left"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
