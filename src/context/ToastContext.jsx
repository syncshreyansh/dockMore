import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, LoaderCircle, X } from 'lucide-react';
import gsap from 'gsap';

const ToastContext = createContext(null);

function formatToastMessage(message, type) {
  const raw = typeof message === 'string' ? message : message?.message || String(message || '');
  if (type !== 'error' && type !== 'danger') return raw;

  const normalized = raw.trim();
  const lower = normalized.toLowerCase();
  if (!normalized) return 'Something went wrong. Try again.';
  if (/\b(project).*(not found|404)|(not found|404).*\b(project)\b/.test(lower)) {
    return 'Project not found. Refresh the page and try again.';
  }
  if (/\b(account).*(not found|404)|(not found|404).*\b(account)\b/.test(lower)) {
    return 'Cloud account not found. Refresh the page and try again.';
  }
  if (/\b(file|folder).*(not found|404)|(not found|404).*\b(file|folder)\b/.test(lower)) {
    return 'File or folder not found. Refresh and try again.';
  }
  if (/not found|\b404\b/i.test(lower)) {
    return 'Could not find what you requested. Refresh and try again.';
  }
  if (/401|unauthorized|session (has )?expired/i.test(lower)) {
    return 'Your session has expired. Sign in again and retry.';
  }
  if (/403|forbidden|permission denied/i.test(lower)) {
    return 'You do not have access to complete that action.';
  }
  if (/failed to fetch|networkerror|network request failed|fetch failed|\boffline\b/i.test(lower)) {
    return 'Could not reach Dockmore. Check your connection and try again.';
  }
  if (/timeout|timed out|aborted/i.test(lower)) {
    return 'Dockmore took too long to respond. Try again.';
  }
  if (/429|too many requests/i.test(lower)) {
    return 'Too many requests. Wait a moment and try again.';
  }
  if (/\b5\d\d\b|internal server error|service unavailable|bad gateway/i.test(lower)) {
    return 'Dockmore could not complete that request. Try again shortly.';
  }
  return normalized.length > 180 ? `${normalized.slice(0, 177).trimEnd()}...` : normalized;
}


function ToastItem({ t, onDismiss, registerDismiss }) {
  const elRef = useRef(null);

  
  const handleDismiss = useCallback(() => {
    if (!elRef.current) {
      onDismiss(t.id);
      return;
    }
    gsap.to(elRef.current, {
      x: 110,
      opacity: 0,
      duration: 0.35,
      ease: 'power3.in',
      onComplete: () => onDismiss(t.id),
    });
  }, [onDismiss, t.id]);

  
  useEffect(() => {
    registerDismiss(t.id, handleDismiss);
    return () => registerDismiss(t.id, null);
  }, [registerDismiss, t.id, handleDismiss]);

  
  useEffect(() => {
    if (!elRef.current) return;
    gsap.fromTo(
      elRef.current,
      {
        x: 110,
        opacity: 0,
      },
      {
        x: 0,
        opacity: 1,
        duration: 0.45,
        ease: 'power3.out',
      }
    );
  }, []);

  const isError = t.type === 'error' || t.type === 'danger';
  const isSuccess = t.type === 'success';
  const isLoading = t.type === 'loading';

  return (
    <div
      ref={elRef}
      style={{ willChange: 'transform, opacity' }}
      role={isError ? 'alert' : 'status'}
      className="pointer-events-auto bg-[#E9E9E9] text-[#242424] text-sm font-normal px-4 py-3.5 rounded-figma shadow-menu border-0 flex items-start justify-between gap-3"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {isLoading ? (
          <LoaderCircle className="w-4 h-4 text-ink shrink-0 animate-spin" aria-label="In progress" />
        ) : isError ? (
          <AlertCircle className="w-4 h-4 text-ink shrink-0" aria-label="Error" />
        ) : isSuccess ? (
          <CheckCircle2 className="w-4 h-4 text-ink shrink-0" aria-label="Success" />
        ) : (
          <Info className="w-4 h-4 text-muted shrink-0" aria-label="Information" />
        )}
        <span className="min-w-0 break-words leading-relaxed">{t.message}</span>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="p-1 rounded-lg text-[#555555] hover:text-ink hover:bg-sidebar transition-colors shrink-0"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismissHandlers = useRef({});

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const registerDismiss = useCallback((id, fn) => {
    if (fn) dismissHandlers.current[id] = fn;
    else delete dismissHandlers.current[id];
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3200) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast = { id, message: formatToastMessage(message, type), type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        const handler = dismissHandlers.current[id];
        if (handler) handler();
        else dismissToast(id); 
      }, duration);
    }

    return id;
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast, toast: showToast, dismissToast }}>
      {children}
      
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[360px] z-[9999] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            t={t}
            onDismiss={dismissToast}
            registerDismiss={registerDismiss}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
