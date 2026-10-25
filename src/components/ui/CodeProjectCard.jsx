import React, { useState, useRef, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  MoreVertical,
  GitCommit,
  Download,
} from 'lucide-react';
import gsap from 'gsap';
import ProviderIcon from './ProviderIcon';
import ConfirmModal from './ConfirmModal';
import { useToast } from '../../context/ToastContext';


export default function CodeProjectCard({
  project,
  onViewSnapshots,
  onRemoveProject,
  onPushToGitHub,
  onToggleWatch,
  busy = false,
  pushPhase = 'idle',
}) {
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const menuRef = useRef(null);

  
  const pillRef = useRef(null);
  const toggleRef = useRef(null);
  const [hoveredSlot, setHoveredSlot] = useState(null); 
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef(null);

  const handleButtonMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const slot = x > rect.width / 2 ? 'paused' : 'watching';
    if (hoveredSlot !== slot) {
      setHoveredSlot(slot);
      if (!showTooltip) {
        clearTimeout(tooltipTimeoutRef.current);
        tooltipTimeoutRef.current = setTimeout(() => {
          setShowTooltip(true);
        }, 1000);
      }
    }
  };

  const handleToggleHoverLeave = () => {
    clearTimeout(tooltipTimeoutRef.current);
    setShowTooltip(false);
    setHoveredSlot(null);
  };

  useEffect(() => {
    return () => clearTimeout(tooltipTimeoutRef.current);
  }, []);

  
  const btnRef = useRef(null);
  const btnContentRef = useRef(null);
  const btnTextRef = useRef(null);
  const githubIconRef = useRef(null);
  const githubFillRef = useRef(null);
  const tickContainerRef = useRef(null);
  const tickPathRef = useRef(null);

  const isWatching = project.watchStatus === 'watching';
  const watchIsStale = project.watchStatus === 'stale';

  useEffect(() => {
    const elements = [githubFillRef.current, githubIconRef.current, btnContentRef.current, tickContainerRef.current, tickPathRef.current].filter(Boolean);
    gsap.killTweensOf(elements);
    if (pushPhase === 'reviewing') {
      gsap.set(btnContentRef.current, { opacity: 1 });
      gsap.set(tickContainerRef.current, { opacity: 0, visibility: 'hidden' });
      gsap.set(tickPathRef.current, { strokeDashoffset: 30 });
      gsap.to(githubFillRef.current, { clipPath: 'inset(0% 0 0 0)', duration: 0.42, ease: 'power2.out', overwrite: 'auto' });
      gsap.fromTo(githubIconRef.current, { y: 0 }, { y: -3, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' });
    } else if (pushPhase === 'ready' || pushPhase === 'pushing') {
      gsap.to(githubFillRef.current, { clipPath: 'inset(0% 0 0 0)', duration: 0.18, overwrite: 'auto' });
    } else if (pushPhase === 'success') {
      const timeline = gsap.timeline();
      timeline.to(btnContentRef.current, { opacity: 0, duration: 0.18 })
        .set(tickContainerRef.current, { visibility: 'visible' })
        .to(tickContainerRef.current, { opacity: 1, duration: 0.18 })
        .to(tickPathRef.current, { strokeDashoffset: 0, duration: 0.38, ease: 'power2.out' });
    } else if (pushPhase === 'idle') {
      gsap.to(githubFillRef.current, { clipPath: 'inset(100% 0 0 0)', duration: 0.2, overwrite: 'auto' });
      gsap.set(githubIconRef.current, { y: 0 });
      gsap.set(btnContentRef.current, { opacity: 1 });
      gsap.set(tickContainerRef.current, { opacity: 0, visibility: 'hidden' });
      gsap.set(tickPathRef.current, { strokeDashoffset: 30 });
    }
    return () => gsap.killTweensOf(elements);
  }, [pushPhase]);

  
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const isFirstMount = useRef(true);

  
  useEffect(() => {
    if (!pillRef.current) return;
    const targetX = isWatching ? 0 : 49;

    if (isFirstMount.current) {
      isFirstMount.current = false;
      gsap.set(pillRef.current, { x: targetX });
      return;
    }

    gsap.to(pillRef.current, {
      x: targetX,
      duration: 0.32,
      ease: 'power2.inOut',
      overwrite: 'auto',
    });
  }, [isWatching]);

  
  const handleToggleClick = () => { if (!busy) onToggleWatch?.(project); };

  
  const handlePushClick = () => { if (!busy) onPushToGitHub?.(project); };

  const handleDownloadZip = () => {
    setMenuOpen(false);
    showToast('Project snapshots are stored locally; use the DockMore CLI to manage the shadow repository.', 'info');
  };

  const handleRemoveConfirm = () => {
    setConfirmOpen(false);
    onRemoveProject?.(project);
  };

  return (
    <>
      <div
        className="code-card"
        style={{
          background: '#E9E9E9',
          borderRadius: '14px',
          padding: '28px 28px 22px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0px',
          position: 'relative',
          fontFamily: '"DM Sans", sans-serif',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          transition: 'box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(48,48,48,0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
        }}
      >
        
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '12px',
              minWidth: 0,
              flex: 1,
            }}
          >
            <h3
              style={{
                fontSize: '24px',
                fontWeight: 600,
                color: '#303030',
                margin: 0,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {project.name}
            </h3>

            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#8C8C8C',
                whiteSpace: 'nowrap',
              }}
            >
              Every {project.interval} min
            </span>
          </div>

          
          <button
            ref={btnRef}
            type="button"
            onClick={handlePushClick}
            disabled={busy}
            aria-label="Review and push project to Git remote"
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#303030',
              color: '#fff',
              border: 'none',
              borderRadius: '14px',
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: 400,
              cursor: 'pointer',
              pointerEvents: 'auto',
              whiteSpace: 'nowrap',
              fontFamily: '"DM Sans", sans-serif',
              flexShrink: 0,
              overflow: 'hidden',
              height: '48px',
              boxSizing: 'border-box',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1a1a1a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#303030';
            }}
          >
            
            <div
              ref={btnContentRef}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                justifyContent: 'center',
              }}
            >
              
              <div
                ref={githubIconRef}
                style={{
                  position: 'relative',
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transformOrigin: 'center center',
                }}
              >
                
                <svg
                  viewBox="0 0 24 24"
                  style={{
                    width: '22px',
                    height: '22px',
                    fill: '#ffffff',
                    opacity: 0.35,
                    position: 'absolute',
                    inset: 0,
                  }}
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>

                
                <svg
                  ref={githubFillRef}
                  viewBox="0 0 24 24"
                  style={{
                    width: '22px',
                    height: '22px',
                    fill: '#ffffff',
                    position: 'absolute',
                    inset: 0,
                    clipPath: 'inset(100% 0 0 0)',
                  }}
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </div>

              
              <span
                ref={btnTextRef}
                style={{
                  display: 'inline-block',
                  fontWeight: 400,
                  willChange: 'transform, opacity',
                }}
              >
                Review and Push
              </span>
            </div>

            
            <div
              ref={tickContainerRef}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                visibility: 'hidden',
                pointerEvents: 'none',
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#e9e9e9"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transformOrigin: 'center center' }}
              >
                <polyline
                  ref={tickPathRef}
                  points="20 6 9 17 4 12"
                  style={{
                    strokeDasharray: 30,
                    strokeDashoffset: 30,
                  }}
                />
              </svg>
            </div>
          </button>
        </div>

        
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                ref={toggleRef}
                type="button"
                onClick={(e) => {
                  handleToggleClick(e);
                  setShowTooltip(false);
                }}
                disabled={busy}
                onMouseMove={handleButtonMouseMove}
                onMouseLeave={handleToggleHoverLeave}
                aria-label={isWatching ? 'Pause watcher' : 'Resume watcher'}
                role="switch"
                aria-checked={isWatching}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#FFFFFF',
                  border: 'none',
                  borderRadius: '18px',
                  padding: '5px 6px',
                  position: 'relative',
                  cursor: 'pointer',
                  gap: '3px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                
                <span
                  ref={pillRef}
                  style={{
                    position: 'absolute',
                    top: '5px',
                    left: '5px',
                    width: '46px',
                    height: '46px',
                    borderRadius: '13px',
                    background: '#303030',
                    zIndex: 0,
                    willChange: 'transform',
                    pointerEvents: 'none',
                  }}
                />

                
                <span
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '46px',
                    height: '46px',
                    borderRadius: '13px',
                    background: 'transparent',
                  }}
                >
                  <Eye
                    className={isWatching ? 'animate-pupil' : ''}
                    style={{
                      width: '22px',
                      height: '22px',
                      color: isWatching ? '#ffffff' : '#8C8C8C',
                      strokeWidth: 1.8,
                      transition: 'color 0.2s ease',
                    }}
                  />
                </span>

                
                <span
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '46px',
                    height: '46px',
                    borderRadius: '13px',
                    background: 'transparent',
                  }}
                >
                  <EyeOff
                    style={{
                      width: '22px',
                      height: '22px',
                      color: isWatching ? '#8C8C8C' : '#ffffff',
                      strokeWidth: 1.8,
                      transition: 'color 0.2s ease',
                    }}
                  />
                </span>

                
                {showTooltip && hoveredSlot && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: hoveredSlot === 'paused' ? '74px' : '33px',
                      transform: 'translateX(-50%)',
                      marginTop: '6px',
                      background: '#303030',
                      color: '#E9E9E9',
                      padding: '4px 8px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 500,
                      fontFamily: '"DM Sans", sans-serif',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      zIndex: 20,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      animation: 'tooltipFadeIn 0.15s ease-out forwards',
                      transition: 'left 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                    }}
                  >
                    {hoveredSlot === 'paused' ? 'Paused' : 'Watching'}
                  </div>
                )}
              </button>
            </div>

            
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#8C8C8C', margin: 0 }}>
              Last snapshot: {project.lastSnapshot}
            </p>
            {watchIsStale && <p style={{ fontSize: '12px', color: '#b45309', margin: 0 }}>Watcher contact lost. Run dockmore repair locally.</p>}
          </div>

          
          <div
            style={{
              background: '#D1D1D1',
              borderRadius: '10px',
              padding: '12px 13px',
              width: '290px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minHeight: '166px',
              boxSizing: 'border-box',
              justifyContent: 'space-between',
            }}
          >
            
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#303030', margin: 0 }}>
              {project.snapshotCount} snapshots
            </p>

            
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                padding: '10px 12px',
                border: '1px solid #E9E9E9',
              }}
            >
              
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 500, color: '#8C8C8C' }}>
                  Last real commit: {project.lastCommitTime}
                </span>
                <GitCommit
                  style={{
                    width: '15px',
                    height: '15px',
                    color: '#8C8C8C',
                    strokeWidth: 1.8,
                    flexShrink: 0,
                    marginLeft: '8px',
                  }}
                />
              </div>

              
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#303030',
                  margin: 0,
                  lineHeight: 1.35,
                  wordBreak: 'break-word',
                }}
              >
                "{project.lastCommitMessage}"
              </p>
            </div>
          </div>
        </div>

        
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#8C8C8C',
                whiteSpace: 'nowrap',
              }}
            >
              Stored locally in:
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#303030',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              DockMore shadow Git
            </span>
          </div>

          
          <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Project actions menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                color: '#303030',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <MoreVertical style={{ width: '20px', height: '20px' }} />
            </button>

            
            {menuOpen && (
              <div
                role="menu"
                aria-label="Project actions"
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: 0,
                  marginBottom: '6px',
                  background: '#FFFFFF',
                  border: '1px solid #D1D1D1',
                  borderRadius: '14px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                  padding: '4px',
                  minWidth: '170px',
                  zIndex: 50,
                  animation: 'codeMenuFadeIn 0.12s ease-out',
                }}
              >
                
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onViewSnapshots?.(project);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '9px 14px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#303030',
                    cursor: 'pointer',
                    transition: 'background 0.12s ease',
                    textAlign: 'left',
                    fontFamily: '"DM Sans", sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Eye style={{ width: '15px', height: '15px', color: '#8C8C8C', strokeWidth: 2 }} />
                  View snapshots
                </button>

                
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleDownloadZip}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '9px 14px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#303030',
                    cursor: 'pointer',
                    transition: 'background 0.12s ease',
                    textAlign: 'left',
                    fontFamily: '"DM Sans", sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Download style={{ width: '15px', height: '15px', color: '#8C8C8C', strokeWidth: 2 }} />
                  Local snapshots (CLI)
                </button>

                
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '9px 14px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#dc2626',
                    cursor: 'pointer',
                    transition: 'background 0.12s ease',
                    textAlign: 'left',
                    fontFamily: '"DM Sans", sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(220,38,38,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                  Remove project
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      
      <ConfirmModal
        isOpen={confirmOpen}
        title={`Remove "${project.name}"?`}
        message="The watcher will stop before this project is removed. Local shadow history remains on the project computer."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleRemoveConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
