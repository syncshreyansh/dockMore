import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Maximize2, Minimize2, Music, Pause, Play, Volume2, VolumeX, X } from 'lucide-react';
import PillButton from './PillButton';
import useMediaSource from '../../hooks/useMediaSource';
import { downloadFile } from '../../api/files';
import { useToast } from '../../context/ToastContext';

function clock(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function MediaViewer({ file, onClose, onPrevious, onNext }) {
  const { url, error, loading, retry } = useMediaSource(file);
  const [playbackError, setPlaybackError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const mediaRef = useRef(null);
  const frameRef = useRef(null);
  const { showToast } = useToast();

  useEffect(() => {
    setPlaybackError(false);
    setPlaying(false);
    setTime(0);
    setDuration(0);
    setSpeed(1);
  }, [url]);
  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  const togglePlay = async () => {
    const media = mediaRef.current;
    if (!media) return;
    if (!media.paused) { media.pause(); return; }
    try { await media.play(); } catch { setPlaybackError(true); }
  };
  const seek = (seconds) => {
    if (!mediaRef.current || !Number.isFinite(duration)) return;
    mediaRef.current.currentTime = Math.max(0, Math.min(duration, Number(seconds)));
    setTime(mediaRef.current.currentTime);
  };
  const changeVolume = (next) => {
    if (!mediaRef.current) return;
    mediaRef.current.volume = Number(next);
    mediaRef.current.muted = Number(next) === 0;
    setVolume(Number(next));
    setMuted(Number(next) === 0);
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === frameRef.current) await document.exitFullscreen();
      else if (frameRef.current?.requestFullscreen) await frameRef.current.requestFullscreen();
      else showToast('Fullscreen is unavailable', 'info');
    } catch { showToast('Fullscreen is unavailable', 'info'); }
  };
  const onKeyboard = (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement || event.target instanceof HTMLSelectElement) return;
    if (event.key === ' ' || event.key === 'k') { event.preventDefault(); togglePlay(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); seek(time - 5); }
    if (event.key === 'ArrowRight') { event.preventDefault(); seek(time + 5); }
  };

  const isPlayable = file.type === 'video' || file.type === 'audio';
  const mediaEvents = {
    ref: mediaRef, src: url, preload: 'metadata', onError: () => setPlaybackError(true),
    onLoadedMetadata: (event) => setDuration(event.currentTarget.duration),
    onDurationChange: (event) => setDuration(event.currentTarget.duration),
    onTimeUpdate: (event) => setTime(event.currentTarget.currentTime),
    onPlay: () => setPlaying(true), onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
  };

  return (
    <section className="rounded-figma bg-sidebar p-4 sm:p-5 flex flex-col gap-4" aria-label={`Viewing ${file.name}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="break-words text-xl font-semibold tracking-tight">{file.name}</h2><p className="mt-1 text-xs text-muted break-words">{file.accountEmail} · {file.size}</p></div>
        <button type="button" onClick={onClose} aria-label="Close media" className="rounded-lg p-1.5 hover:bg-track/60 shrink-0"><X className="h-5 w-5" /></button>
      </div>
      <div ref={frameRef} tabIndex={isPlayable ? 0 : undefined} onKeyDown={isPlayable ? onKeyboard : undefined} className="dm-media-frame relative flex min-h-[260px] sm:min-h-[400px] flex-col items-center justify-center rounded-figma bg-white overflow-hidden focus:outline-none focus:ring-2 focus:ring-ink">
        {loading && <p role="status" className="text-sm text-muted">Loading media...</p>}
        {(error || playbackError) && <div role="alert" className="max-w-md p-6 text-center text-sm leading-relaxed"><p>{error || 'This file could not play. The format may not be supported by your browser, or the media link may have expired.'}</p><button type="button" onClick={() => { setPlaybackError(false); retry(); }} className="mt-3 font-medium underline">Try again</button></div>}
        {url && !playbackError && !error && file.type === 'image' && <img src={url} alt={file.name} onError={() => setPlaybackError(true)} className="max-h-[65dvh] w-full object-contain" />}
        {url && !playbackError && !error && isPlayable && <>
          <div className={`relative flex w-full flex-1 items-center justify-center ${file.type === 'video' ? 'bg-ink' : 'bg-white'}`}>
            {file.type === 'video'
              ? <video key={url} {...mediaEvents} playsInline onClick={togglePlay} className="max-h-[65dvh] w-full cursor-pointer object-contain" />
              : <div className="flex min-h-[260px] flex-col items-center justify-center gap-5 p-6"><Music className="h-20 w-20 text-muted" strokeWidth={1} /><p className="max-w-lg text-center break-words text-sm">{file.name}</p><audio key={url} {...mediaEvents} /></div>}
            {!playing && file.type === 'video' && <button type="button" onClick={togglePlay} aria-label="Play media" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 p-4 text-ink"><Play className="h-6 w-6" fill="currentColor" /></button>}
          </div>
          <div className="w-full bg-white px-4 py-3 sm:px-5" aria-label="Media controls">
            <input type="range" min="0" max={Number.isFinite(duration) && duration > 0 ? duration : 0} step="0.1" value={Math.min(time, Number.isFinite(duration) && duration > 0 ? duration : 0)} onChange={(event) => seek(event.target.value)} aria-label="Seek" className="dm-media-range w-full" />
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              <button type="button" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} className="rounded-lg p-1 hover:bg-sidebar">{playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}</button>
              <span className="tabular-nums text-xs text-muted">{clock(time)} / {clock(duration)}</span>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={() => { if (!mediaRef.current) return; mediaRef.current.muted = !mediaRef.current.muted; setMuted(mediaRef.current.muted); }} aria-label={muted ? 'Unmute' : 'Mute'} className="rounded-lg p-1 hover:bg-sidebar">{muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>
                <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => changeVolume(event.target.value)} aria-label="Volume" className="dm-media-range w-16 sm:w-24" />
                <select aria-label="Playback speed" value={speed} onChange={(event) => { const next = Number(event.target.value); setSpeed(next); if (mediaRef.current) mediaRef.current.playbackRate = next; }} className="rounded-lg bg-sidebar px-2 py-1 text-xs font-medium"><option value="0.5">0.5×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select>
                <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} className="rounded-lg p-1 hover:bg-sidebar">{fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}</button>
              </div>
            </div>
          </div>
        </>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2"><PillButton size="sm" variant="ghost" icon={ChevronLeft} onClick={onPrevious} disabled={!onPrevious}>Previous</PillButton><PillButton size="sm" variant="ghost" icon={ChevronRight} onClick={onNext} disabled={!onNext}>Next</PillButton></div>
        <div className="flex gap-2">{file.type === 'image' && <PillButton size="sm" variant="ghost" icon={Maximize2} onClick={toggleFullscreen}>Fullscreen</PillButton>}<PillButton size="sm" icon={Download} onClick={() => downloadFile(file).catch((err) => showToast(err.message, 'error'))}>Download</PillButton></div>
      </div>
    </section>
  );
}
