import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIncrementalList } from '../../hooks/useIncrementalList';

export default function CustomSelect({
  value,
  options = [],
  onChange,
  placeholder = 'Select an option',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const dropdownRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = useMemo(
    () => deferredQuery ? options.filter((option) => option.label.toLowerCase().includes(deferredQuery.toLowerCase())) : options,
    [options, deferredQuery]
  );
  const { visibleItems: visibleOptions, hasMore, sentinelRef, loadMore } = useIncrementalList(filteredOptions, 60, deferredQuery);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => { if (!isOpen) setQuery(''); setIsOpen(!isOpen); }}
        onKeyDown={(event) => { if (event.key === 'Escape') setIsOpen(false); }}
        className="w-full px-4 py-2.5 rounded-figma bg-sidebar text-sm font-normal text-ink flex items-center justify-between transition-colors focus-visible:outline-ink"
      >
        <span className="truncate pr-4 text-left">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute z-50 w-full mt-2 bg-white rounded-figma shadow-menu p-1.5 border border-black/5"
          >
            {options.length > 40 && (
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Escape') setIsOpen(false); }}
                aria-label={`Search ${placeholder}`}
                placeholder="Search options..."
                className="mb-1.5 w-full rounded-figma border-0 bg-sidebar px-3 py-2 text-sm"
              />
            )}
            <ul role="listbox" aria-label={placeholder} className="max-h-60 overflow-y-auto flex flex-col gap-0.5 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {visibleOptions.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === option.value}
                    onClick={() => { onChange?.(option.value); setIsOpen(false); setQuery(''); }}
                    className={`w-full text-left px-3 py-2.5 text-[13px] leading-relaxed rounded-figma transition-colors ${value === option.value ? 'bg-ink text-white font-semibold shadow-sm' : 'text-ink hover:bg-black/5'}`}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
              {hasMore && <li ref={sentinelRef} role="presentation"><button type="button" onClick={loadMore} className="w-full rounded-figma px-3 py-2 text-left text-xs font-medium text-muted hover:bg-black/5">Show more options</button></li>}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
