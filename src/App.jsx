import React, { useState, useRef, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import gsap from 'gsap';
import AppProviders from './context/AppProviders';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import AllFiles from './pages/AllFiles';
import Transfers from './pages/Transfers';
import Code from './pages/Code';
import Accounts from './pages/Accounts';
import Settings from './pages/Settings';
import IntroLoader, { shouldSkipIntro } from './components/ui/IntroLoader';
import { IntroProvider } from './context/IntroContext';

import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import CliAuth from './pages/CliAuth';
import ProtectedRoute, { PublicOnlyRoute } from './components/layout/ProtectedRoute';

export default function App() {
  const [introComplete, setIntroComplete] = useState(shouldSkipIntro);
  const contentRef = useRef(null);

  
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  const handleExitStart = useCallback(() => {
    if (!contentRef.current) return;

    
    gsap.fromTo(
      contentRef.current,
      { opacity: 0, scale: 0.98 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.45,
        ease: 'power3.out',
      }
    );
  }, []);

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
  }, []);

  return (
    <AppProviders>
      <IntroProvider value={{ introComplete }}>
        <BrowserRouter>
          {!introComplete && (
            <IntroLoader
              onExitStart={handleExitStart}
              onComplete={handleIntroComplete}
            />
          )}

          <div
            ref={contentRef}
            style={{
              opacity: introComplete ? 1 : 0,
              transform: introComplete ? 'scale(1)' : 'scale(0.98)',
              pointerEvents: introComplete ? 'auto' : 'none',
            }}
          >
            <Routes>
              
              <Route
                path="/signin"
                element={
                  <PublicOnlyRoute>
                    <SignIn />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicOnlyRoute>
                    <SignUp />
                  </PublicOnlyRoute>
                }
              />

              
              <Route path="/cli-auth" element={<CliAuth />} />

              
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout introComplete={introComplete} />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Home />} />
                <Route path="/files" element={<AllFiles />} />
                <Route path="/transfers" element={<Transfers />} />
                <Route path="/code" element={<Code />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </div>
        </BrowserRouter>
      </IntroProvider>
    </AppProviders>
  );
}


