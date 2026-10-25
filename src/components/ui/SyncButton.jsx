import React, { useEffect, useRef, useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const LETTERS = ['d', 'o', 'c', 'k', 'M', 'o', 'r', 'e', '.'];

export default function SyncButton({ onSync, isSyncingProp = false }) {
  const [internalStatus, setInternalStatus] = useState('idle');
  const resetTimerRef = useRef(null);
  const status = isSyncingProp ? 'syncing' : internalStatus;

  useEffect(() => () => clearTimeout(resetTimerRef.current), []);

  const handleClick = async () => {
    if (status !== 'idle') return;

    clearTimeout(resetTimerRef.current);
    setInternalStatus('syncing');
    const startedAt = Date.now();

    try {
      await onSync?.();

      // Keep the branded letter animation visible long enough to read.
      const remainingAnimationTime = Math.max(0, 2500 - (Date.now() - startedAt));
      if (remainingAnimationTime) {
        await new Promise((resolve) => setTimeout(resolve, remainingAnimationTime));
      }

      setInternalStatus('success');
      resetTimerRef.current = setTimeout(() => setInternalStatus('idle'), 1500);
    } catch {
      setInternalStatus('idle');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status !== 'idle'}
      aria-label={status === 'syncing' ? 'Syncing account' : status === 'success' ? 'Account synced' : 'Sync account now'}
      className="relative inline-flex h-7 min-w-[110px] items-center justify-center gap-1.5 overflow-hidden rounded-figma bg-ink px-3.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-[#404040]"
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === 'idle' && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="absolute flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync now</span>
          </motion.span>
        )}

        {status === 'syncing' && (
          <motion.span
            key="syncing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute flex items-baseline"
            style={{ fontFamily: "'Siffonn', sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: '-0.02em' }}
          >
            {LETTERS.map((char, index) => (
              <motion.span
                key={`${char}-${index}`}
                initial={{ opacity: 0.25 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 0.1,
                  delay: index * 0.12,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  repeatDelay: 0.8,
                }}
                style={char === 'M' ? {
                  fontFamily: "'Times New Roman', Times, serif",
                  fontStyle: 'italic',
                  fontSize: '0.92em',
                  marginLeft: '0.1em',
                } : undefined}
              >
                {char}
              </motion.span>
            ))}
          </motion.span>
        )}

        {status === 'success' && (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="absolute flex items-center text-green-400"
          >
            <Check className="h-4 w-4 stroke-[3]" />
          </motion.span>
        )}
      </AnimatePresence>

      <span aria-hidden="true" className="pointer-events-none flex items-center gap-1.5 opacity-0">
        <RefreshCw className="h-3.5 w-3.5" />
        <span>Sync now</span>
      </span>
    </button>
  );
}
