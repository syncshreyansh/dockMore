import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import gsap from 'gsap';

const ToastContext = createContext(null);


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
      filter: 'blur(6px)',
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
        filter: 'blur(6px)',
      },
      {
        x: 0,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.45,
        ease: 'power3.out',
      }
    );
  }, []);

  const isError = t.type === 'error' || t.type === 'danger';
  const isSuccess = t.type === 'success';

  return (
    <div
      ref={elRef}
      style={{ willChange: 'transform, opacity, filter' }}
      className="pointer-events-auto bg-ink text-white text-xs sm:text-sm font-medium px-4 py-3 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.25)] border border-white/10 flex items-center justify-between gap-3 select-none"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {isError ? (
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
        ) : isSuccess ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        ) : (
          <Info className="w-4 h-4 text-white/80 shrink-0" />
        )}
        <span className="truncate leading-tight">{t.message}</span>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
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
    const newToast = { id, message, type };

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
      
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
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
