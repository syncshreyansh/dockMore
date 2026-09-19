import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import '../../styles/intro-loader.css';

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


const INITIAL_DELAY = 0.1;
const LETTER_DURATION = 0.52;
const LETTER_STAGGER = 0.075;
const HOLD_AFTER_REVEAL = 0.25;
const EXIT_DURATION = 0.45;
const CONTENT_CROSSFADE_LEAD = 0.12;


export default function IntroLoader({ onExitStart, onComplete }) {
  const containerRef = useRef(null);
  const wordRef = useRef(null);
  const letterRefs = useRef([]);
  const reducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (reducedMotion.current) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!reducedMotion.current) return;

    onComplete?.();
  }, [onComplete]);

  useGSAP(
    () => {
      if (reducedMotion.current) return;

      const letters = letterRefs.current.filter(Boolean);
      if (!letters.length || !wordRef.current || !containerRef.current) {
        onComplete?.();
        return;
      }

      const ctx = gsap.context(() => {
        const tl = gsap.timeline({
          delay: INITIAL_DELAY,
          onComplete: () => {
            onComplete?.();
          },
        });

        const revealEnd = (letters.length - 1) * LETTER_STAGGER + LETTER_DURATION;
        const exitStart = revealEnd + HOLD_AFTER_REVEAL;

        
        tl.fromTo(
          wordRef.current,
          {
            scale: 0.90,
            force3D: true,
          },
          {
            scale: 1.08,
            duration: exitStart,
            ease: 'power1.out',
            force3D: true,
          },
          0
        );

        
        tl.fromTo(
          letters,
          {
            opacity: 0,
            filter: 'blur(6px)',
            y: 8,
            force3D: true,
          },
          {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            duration: LETTER_DURATION,
            ease: 'power3.out',
            stagger: LETTER_STAGGER,
            onComplete: () => {
              letters.forEach((el) => {
                if (el.dataset.capitalM === 'true') {
                  el.classList.add('is-revealed');
                }
              });
            },
          },
          0
        );

        
        tl.call(() => onExitStart?.(), null, exitStart - CONTENT_CROSSFADE_LEAD);

        
        tl.to(
          wordRef.current,
          {
            opacity: 0,
            scale: 1.15, 
            
            duration: EXIT_DURATION,
            ease: 'power2.out', 
            force3D: true,
          },
          exitStart
        );

        
        tl.to(
          containerRef.current,
          {
            opacity: 0,
            duration: EXIT_DURATION,
            ease: 'power2.inOut',
          },
          exitStart
        );
      }, containerRef);

      return () => ctx.revert();
    },
    { scope: containerRef, dependencies: [onExitStart, onComplete] }
  );

  if (reducedMotion.current) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="intro-loader"
      role="presentation"
      aria-hidden="true"
    >
      <div ref={wordRef} className="intro-loader__word">
        {LETTERS.map(({ char, isCapitalM }, index) => {
          return (
            <span
              key={index}
              ref={(el) => {
                letterRefs.current[index] = el;
              }}
              data-capital-m={isCapitalM ? 'true' : undefined}
              className={
                isCapitalM
                  ? 'intro-loader__letter intro-loader__letter--m'
                  : 'intro-loader__letter'
              }
            >
              {char}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function shouldSkipIntro() {
  if (typeof window === 'undefined') return true;

  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}


