import React, { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import gsap from 'gsap';
import AppProviders from './context/AppProviders';
import AppLayout from './components/layout/AppLayout';
import IntroLoader, { shouldSkipIntro } from './components/ui/IntroLoader';
import { IntroProvider } from './context/IntroContext';

import ProtectedRoute, { PublicOnlyRoute } from './components/layout/ProtectedRoute';

const Home = lazy(() => import('./pages/Home'));
const AllFiles = lazy(() => import('./pages/AllFiles'));
const Media = lazy(() => import('./pages/Media'));
const Transfers = lazy(() => import('./pages/Transfers'));
const Code = lazy(() => import('./pages/Code'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Settings = lazy(() => import('./pages/Settings'));
const SignIn = lazy(() => import('./pages/SignIn'));
const SignUp = lazy(() => import('./pages/SignUp'));
const CliAuth = lazy(() => import('./pages/CliAuth'));

function PageLoading() {
  return (
    <div role="status" aria-label="Loading page" className="flex min-h-[40vh] w-full items-center justify-center">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-track border-t-ink" />
    </div>
  );
}

function lazyPage(Page) {
  return <Suspense fallback={<PageLoading />}><Page /></Suspense>;
}

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
                    {lazyPage(SignIn)}
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicOnlyRoute>
                    {lazyPage(SignUp)}
                  </PublicOnlyRoute>
                }
              />

              
              <Route path="/cli-auth" element={lazyPage(CliAuth)} />

              
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout introComplete={introComplete} />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={lazyPage(Home)} />
                <Route path="/files" element={lazyPage(AllFiles)} />
                <Route path="/media" element={lazyPage(Media)} />
                <Route path="/transfers" element={lazyPage(Transfers)} />
                <Route path="/code" element={lazyPage(Code)} />
                <Route path="/accounts" element={lazyPage(Accounts)} />
                <Route path="/settings" element={lazyPage(Settings)} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </div>
        </BrowserRouter>
      </IntroProvider>
    </AppProviders>
  );
}


