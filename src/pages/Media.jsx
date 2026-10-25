import React, { useDeferredValue, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Image, Video, Music, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFiles } from '../hooks/useFiles';
import { useAccounts } from '../hooks/useAccounts';
import { useIncrementalList } from '../hooks/useIncrementalList';
import FileThumbnail from '../components/ui/FileThumbnail';
import MediaViewer from '../components/ui/MediaViewer';
import PillButton from '../components/ui/PillButton';

const types = [{ id: 'all', label: 'All Media' }, { id: 'image', label: 'Photos', icon: Image }, { id: 'video', label: 'Videos', icon: Video }, { id: 'audio', label: 'Audio', icon: Music }];

export default function Media() {
  const { files, loading, error, refetch } = useFiles();
  const { accounts } = useAccounts();
  const expiredCount = accounts.filter((account) => account.status === 'expired').length;
  const [params, setParams] = useSearchParams();
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const media = useMemo(() => files.filter((file) => !file.isFolder && ['image', 'video', 'audio'].includes(file.type)), [files]);
  const visible = useMemo(() => media.filter((file) => (type === 'all' || file.type === type) && `${file.name} ${file.path} ${file.accountEmail}`.toLowerCase().includes(deferredSearch.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)), [media, type, deferredSearch]);
  const { visibleItems: visibleMedia, hasMore, sentinelRef, loadMore } = useIncrementalList(visible, 48, `${type}|${deferredSearch}`);
  const selected = media.find((file) => file.id === params.get('file'));
  const selectedIndex = visible.findIndex((file) => file.id === selected?.id);
  const open = (file) => setParams(file ? { file: file.id } : {});
  return (
    <div className="flex flex-col gap-6">
      {expiredCount > 0 && <div role="status" className="dm-notice">{expiredCount} cloud {expiredCount === 1 ? 'account needs' : 'accounts need'} to be reconnected. <Link to="/accounts" className="underline">Reconnect from Cloud Accounts</Link>.</div>}
      {error && <div role="alert" className="dm-notice">Some files could not be loaded: {error} {/revoked|expired|reconnect/i.test(error) && <Link to="/accounts" className="ml-2 underline">Reconnect account</Link>} <button onClick={refetch}>Retry</button></div>}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3"><div><h2 className="text-2xl font-semibold tracking-tight">Your Media</h2><p className="mt-1 text-sm text-muted">Photos, videos, and audio from all your connected folders.</p></div><PillButton size="sm" variant="ghost" icon={RefreshCw} onClick={refetch} disabled={loading}>Refresh</PillButton></div>
      {selected && <MediaViewer key={selected.id} file={selected} onClose={() => open(null)} onPrevious={selectedIndex > 0 ? () => open(visible[selectedIndex - 1]) : null} onNext={selectedIndex >= 0 && selectedIndex < visible.length - 1 ? () => open(visible[selectedIndex + 1]) : null} />}
      <section className="rounded-figma bg-sidebar p-4 sm:p-6 flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
            {types.map((item) => {
              const isActive = type === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setType(item.id)}
                  aria-pressed={isActive}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-figma text-sm font-semibold shrink-0 transition-colors duration-150 ${isActive ? 'text-white' : 'text-ink hover:bg-white'}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mediaTabIndicator"
                      className="absolute inset-0 bg-ink rounded-figma z-0"
                      transition={{ type: 'spring', bounce: 0.08, duration: 0.38 }}
                    />
                  )}
                  <span className="relative z-10">
                    {item.label} <span className="text-xs opacity-70">{media.filter((file) => item.id === 'all' || file.type === item.id).length}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <input type="search" aria-label="Search media" placeholder="Search media..." value={search} onChange={(event) => setSearch(event.target.value)} className="w-full lg:w-64 rounded-figma bg-sidebar border-0 px-4 py-2 text-sm" />
        </div>
        {loading && <p role="status" className="py-6 text-center text-sm text-muted">Loading your media...</p>}
        {!loading && !visible.length && <p className="py-14 text-center text-sm text-muted">{search ? 'No media matches your search.' : 'No media files found. Connect Google Drive or refresh to load your files.'}</p>}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">{visibleMedia.map((file) => <button type="button" key={file.id} onClick={() => open(file)} aria-label={`Open ${file.name}`} className={`dm-media-tile overflow-hidden rounded-figma bg-white text-left border transition-colors duration-150 ${selected?.id === file.id ? 'border-ink ring-1 ring-ink' : 'border-transparent'}`}><FileThumbnail file={file} /><div className="p-3"><p className="truncate text-sm font-medium">{file.name}</p><p className="mt-1 truncate text-xs text-muted">{file.path} · {file.size}</p></div></button>)}</div>
        {hasMore && !loading && <div ref={sentinelRef} className="flex justify-center py-4"><PillButton size="sm" variant="ghost" onClick={loadMore}>Show more media</PillButton></div>}
      </section>
    </div>
  );
}
