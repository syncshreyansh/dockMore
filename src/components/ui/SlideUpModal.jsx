import React, { useRef, useLayoutEffect, useState, useCallback } from 'react';
import gsap from 'gsap';


export default function SlideUpModal({
  isOpen,
  onClose,
  children,
  panelClassName = 'bg-surface rounded-3xl p-6 sm:p-8 max-w-lg w-full flex flex-col gap-5 relative shadow-2xl',
  closeOnBackdrop = true,
}) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  
  if (isOpen && !isMounted) {
    setIsMounted(true);
  }

  
  useLayoutEffect(() => {
    if (!isMounted) return;

    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!overlay || !panel) return;

    const bottomDistance = typeof window !== 'undefined' ? window.innerHeight + 150 : 1000;
    const topDistance = typeof window !== 'undefined' ? -(window.innerHeight + 150) : -1000;

    if (isOpen) {
      
      gsap.killTweensOf([overlay, panel]);

      
      gsap.fromTo(
        overlay,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: 'power2.inOut' }
      );

      
      gsap.fromTo(
        panel,
        { y: bottomDistance, filter: 'blur(16px)', opacity: 1, scale: 1 },
        {
          y: 0,
          filter: 'blur(0px)',
          opacity: 1,
          scale: 1,
          duration: 0.55,
          ease: 'power3.inOut',
          clearProps: 'filter', 
        }
      );
    } else {
      
      gsap.killTweensOf([overlay, panel]);

      const tl = gsap.timeline({
        onComplete: () => {
          setIsMounted(false);
        },
      });

      
      tl.to(panel, {
        y: topDistance,
        filter: 'blur(14px)',
        opacity: 1,
        duration: 0.45,
        ease: 'power3.inOut',
      });

      
      tl.to(
        overlay,
        { opacity: 0, duration: 0.25, ease: 'power2.inOut' },
        '-=0.2'
      );
    }
  }, [isOpen, isMounted]);

  const handleOverlayClick = useCallback(
    (e) => {
      if (closeOnBackdrop && e.target === overlayRef.current) {
        onClose();
      }
    },
    [onClose, closeOnBackdrop]
  );

  if (!isMounted) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-hidden"
      onClick={handleOverlayClick}
      style={{ opacity: 0 }}
    >
      <div
        ref={panelRef}
        className={panelClassName}
        style={{
          transform: 'translateY(120vh)',
          willChange: 'transform, filter',
        }}
      >
        {children}
      </div>
    </div>
  );
}
