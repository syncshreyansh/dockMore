import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Check, FolderOpen, Edit3, Trash2, Download, Share2, Play, Music } from 'lucide-react';
import ProviderIcon from './ProviderIcon';
import { getFileIcon } from './FileRow';

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

  if (!file) return null;

  const { name, extension, provider, modified, size } = file;
  const FileTypeIcon = getFileIcon(extension);

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

  
  const cleanExt = (extension || '').toLowerCase().replace('.', '');
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(cleanExt);
  const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(cleanExt);
  const isAudio = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(cleanExt);

  const thumbnail = isImage
    ? (file.previewUrl || `https://picsum.photos/seed/${file.id || name}/400/250`)
    : isVideo
    ? `https://picsum.photos/seed/${file.id || name}/400/250`
    : null;

  return (
    <div
      onClick={onSelect}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpen(true);
      }}
      className={`group relative bg-white rounded-2xl cursor-pointer select-none transition-all duration-150 ease-out flex flex-col overflow-visible shadow-sm hover:shadow-md ${
        isSelected ? 'ring-2 ring-ink' : 'border border-track/40 hover:border-ink/20'
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

      
      <div className="aspect-square bg-surface w-full relative flex items-center justify-center overflow-hidden rounded-t-2xl border-b border-track/40">
        {isAudio ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface via-white to-track/20 gap-2">
            <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center text-ink/70 group-hover:scale-110 transition-transform">
              <Music className="w-6 h-6 stroke-[1.8]" />
            </div>
          </div>
        ) : thumbnail ? (
          <>
            <img
              src={thumbnail}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-black/55 backdrop-blur-xs flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </div>
              </div>
            )}
          </>
        ) : (
          <FileTypeIcon className="w-12 h-12 text-muted/50 group-hover:scale-110 transition-transform duration-300" />
        )}
      </div>

      
      <div className="p-3 flex items-center justify-between gap-2 bg-white relative rounded-b-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <FileTypeIcon className="w-4 h-4 text-ink shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-ink truncate max-w-[120px] sm:max-w-[150px] leading-tight">
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
              className="absolute right-0 bottom-full mb-1 bg-white border border-track/60 shadow-[0_4px_24px_rgba(0,0,0,0.14)] rounded-2xl p-1.5 min-w-[150px] z-50 flex flex-col gap-1 text-ink"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction && onAction('preview', file);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 text-left"
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
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 text-left"
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
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 text-left"
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
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 text-left"
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
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 text-left"
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
