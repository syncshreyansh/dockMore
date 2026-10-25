import React, { useEffect, useRef, useState } from 'react';
import { Folder, FileText, Image, Film, Music, Play } from 'lucide-react';
import useMediaSource from '../../hooks/useMediaSource';

export default function FileThumbnail({ file }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    if (!ref.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '150px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [file.id]);
  const { url } = useMediaSource(file, 'thumbnail', visible && file.hasThumbnail && !file.isFolder && !failed);
  const Icon = file.isFolder ? Folder : ({ image: Image, video: Film, audio: Music }[file.type] || FileText);
  return (
    <div ref={ref} className="aspect-[4/3] w-full overflow-hidden rounded-t-figma bg-sidebar relative flex items-center justify-center border-b border-track/40">
      {url && !failed ? <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" /> : <Icon className="h-10 w-10 text-muted" strokeWidth={1.5} />}
      {file.type === 'video' && <span className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="rounded-full bg-ink/75 p-3 text-white"><Play className="h-5 w-5" fill="currentColor" /></span></span>}
      {file.durationMs > 0 && <span className="absolute bottom-2 right-2 rounded-md bg-ink/80 px-1.5 py-0.5 text-[11px] text-white">{Math.floor(file.durationMs / 60000)}:{String(Math.floor(file.durationMs / 1000) % 60).padStart(2, '0')}</span>}
    </div>
  );
}
