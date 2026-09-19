import React, { useState } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LETTERS = [
  { char: 'd' },
  { char: 'o' },
  { char: 'c' },
  { char: 'k' },
  { char: 'M', isCapitalM: true },
  { char: 'o' },
  { char: 'r' },
  { char: 'e' },
  { char: '.' },
];

export default function SyncButton({ onSync, isSyncingProp }) {
  const [internalStatus, setInternalStatus] = useState('idle'); 

  const handleClick = async () => {
    if (internalStatus !== 'idle') return;
    
    setInternalStatus('syncing');
    
    
    if (onSync) onSync();
    
    
    setTimeout(() => {
      setInternalStatus('success');
      
      
      setTimeout(() => {
        setInternalStatus('idle');
      }, 1500);
      
    }, 2500); 
  };

  
  const status = isSyncingProp ? 'syncing' : internalStatus;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status !== 'idle'}
      className="relative flex items-center justify-center gap-2 h-7 px-3.5 bg-ink text-white rounded-figma text-xs font-semibold overflow-hidden transition-all duration-300 min-w-[110px] hover:bg-[#404040]"
    >
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 absolute"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync now</span>
          </motion.div>
        )}
        
        {status === 'syncing' && (
          <motion.div
            key="syncing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-baseline absolute"
            style={{ fontFamily: "'Siffonn', sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: '-0.02em' }}
          >
            {LETTERS.map(({ char, isCapitalM }, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0.25 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 0.1,
                  delay: i * 0.12,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  repeatDelay: 0.8,
                }}
                style={isCapitalM ? {
                  fontFamily: "'Times New Roman', Times, serif",
                  fontStyle: 'italic',
                  fontSize: '0.92em',
                  marginLeft: '0.1em',
                } : {}}
              >
                {char}
              </motion.span>
            ))}
          </motion.div>
        )}
        
        {status === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="flex items-center text-green-400 absolute"
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </motion.div>
        )}
      </AnimatePresence>
      
      
      <div className="opacity-0 flex items-center gap-1.5 pointer-events-none">
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Sync now</span>
      </div>
    </button>
  );
}
