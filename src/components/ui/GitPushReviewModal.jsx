import React, { useEffect, useState } from 'react';
import SlideUpModal from './SlideUpModal';
import PillButton from './PillButton';

function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`rounded-figma bg-track/70 ${className}`} />;
}

export default function GitPushReviewModal({ review, busy, onClose, onConfirm, onRemoteChange, onRetry }) {
  const [message, setMessage] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    setMessage(review?.suggestedMessage || review?.pendingPush?.message || '');
    setAcknowledged(false);
  }, [review]);

  if (!review) return null;
  const loading = Boolean(review.loading);
  const pending = Boolean(review.pendingPush);
  const warnings = review.warnings || [];
  const canPush = pending || (message.trim().length > 0 && (!warnings.length || acknowledged));

  return (
    <SlideUpModal
      isOpen={Boolean(review)}
      onClose={onClose}
      closeOnBackdrop={!busy}
      panelClassName="bg-surface rounded-figma p-6 sm:p-8 max-w-[740px] w-full max-h-[90vh] overflow-y-auto sidebar-scroll flex flex-col gap-5 shadow-menu"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[22px] leading-tight font-semibold text-ink">{pending ? 'Retry Git push' : 'Review and Push'}</h3>
          <p className="mt-1 text-xs text-muted truncate">{review.projectName}</p>
        </div>
        {!loading && !review.error && (
          <span className="rounded-full bg-ink px-3 py-1 text-[11px] font-medium text-white shrink-0">
            {pending ? `${review.pendingPush.remote} / ${review.pendingPush.branch}` : `${review.remote} / ${review.branch}`}
          </span>
        )}
      </div>

      {loading ? (
        <div aria-busy="true" aria-label="Preparing Git review" className="flex flex-col gap-4">
          <p className="text-sm text-muted">Preparing your changes for review...</p>
          <div className="rounded-figma bg-white p-4 flex flex-col gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <div className="rounded-figma bg-white p-4 flex flex-col gap-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="rounded-figma bg-white p-4 flex flex-col gap-3 min-h-48">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="flex justify-end"><PillButton variant="ghost" size="sm" onClick={onClose}>Cancel</PillButton></div>
        </div>
      ) : review.error ? (
        <>
          <div role="alert" className="rounded-figma bg-white p-5">
            <p className="text-sm font-semibold text-ink">Could not prepare this push</p>
            <p className="mt-1 text-xs text-muted break-words">{review.error}</p>
          </div>
          <div className="flex justify-end gap-2">
            <PillButton variant="ghost" size="sm" onClick={onClose}>Close</PillButton>
            <PillButton variant="solid" size="sm" onClick={onRetry}>Try again</PillButton>
          </div>
        </>
      ) : pending ? (
        <>
          <div className="rounded-figma bg-white p-5">
            <p className="text-sm font-semibold text-ink">Commit {review.pendingPush.hash?.slice(0, 7)} is ready locally.</p>
            <p className="mt-1 text-xs text-muted">Retry the push to {review.pendingPush.remote} and update DockMore after it succeeds.</p>
          </div>
          <div className="flex justify-end gap-2">
            <PillButton variant="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</PillButton>
            <PillButton variant="solid" size="sm" onClick={() => onConfirm({ message, warningsAcknowledged: true })} disabled={busy}>{busy ? 'Working...' : 'Retry push'}</PillButton>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-figma bg-white p-4">
            <p className="text-sm font-semibold text-ink">{review.files.length} changed file{review.files.length === 1 ? '' : 's'}</p>
            <p className="mt-1 text-xs text-muted break-words">{review.files.join('  ·  ')}</p>
          </div>

          {review.remotes?.length > 1 && (
            <label className="text-xs font-semibold text-ink">
              Git remote
              <select value={review.remote} onChange={(event) => onRemoteChange(event.target.value)} disabled={busy} className="mt-2 w-full rounded-figma bg-white px-4 py-3 text-sm text-ink outline-none">
                {review.remotes.map((remote) => <option key={remote} value={remote}>{remote}</option>)}
              </select>
            </label>
          )}

          {warnings.length > 0 && (
            <div className="rounded-figma bg-white p-4 text-ink">
              <p className="text-sm font-semibold">Review warnings</p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
              <label className="flex items-center gap-2 mt-4 text-xs cursor-pointer">
                <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
                I reviewed these warnings and still want to push.
              </label>
            </div>
          )}

          <label className="text-xs font-semibold text-ink" htmlFor="git-push-message">Commit message</label>
          <input id="git-push-message" value={message} maxLength={500} onChange={(event) => setMessage(event.target.value)} className="w-full rounded-figma bg-white px-4 py-3 text-sm text-ink outline-none" />

          <div className="rounded-figma bg-white p-4">
            <p className="text-xs font-semibold text-ink mb-2">Exact proposed changes</p>
            <pre className="max-h-56 overflow-auto sidebar-scroll text-[11px] leading-5 text-ink whitespace-pre-wrap break-all select-text">{review.diff}</pre>
          </div>

          <div className="flex justify-end gap-2">
            <PillButton variant="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</PillButton>
            <PillButton variant="solid" size="sm" onClick={() => onConfirm({ message: message.trim(), warningsAcknowledged: acknowledged })} disabled={busy || !canPush}>
              {busy ? 'Working...' : 'Commit and push'}
            </PillButton>
          </div>
        </>
      )}
    </SlideUpModal>
  );
}
