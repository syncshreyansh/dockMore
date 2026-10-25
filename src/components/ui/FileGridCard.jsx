import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Check, FolderOpen, Edit3, Trash2, Download, Share2, Play, Music } from 'lucide-react';
import ProviderIcon from './ProviderIcon';
import { getFileIcon } from './FileRow';
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


  const { name, extension, provider, modified, size } = file || {};
  const FileTypeIcon = file?.isFolder ? FolderOpen : getFileIcon(extension);

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
      className={`group relative bg-white rounded-figma cursor-pointer select-none transition-colors duration-150 ease-out flex flex-col overflow-visible shadow-sm hover:shadow-panel ${
        isSelected ? 'ring-2 ring-ink' : ''
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

      <div className="p-3 flex items-center justify-between gap-2 bg-white relative rounded-b-figma">
        <div className="flex items-center gap-2 min-w-0">
          <FileTypeIcon className="w-4 h-4 text-ink shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-ink truncate max-w-[120px] sm:max-w-[150px] leading-tight">
              {name}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <ProviderIcon provider={provider} size="xs" />
              <span className="text-[10px] text-muted truncate">
                {modified} • {size}
              </span>
            </div>
          </div>
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
