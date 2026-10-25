import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, Terminal, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/apiClient';
import Logo from '../components/ui/Logo';

export default function CliAuth() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sessionId = searchParams.get('session');

  const [status, setStatus] = useState('loading'); 
  const [error, setError] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');

  useEffect(() => {
    
    if (authLoading) return;

    
    if (!user) {
      navigate(`/signin`, {
        replace: true,
        state: { from: { pathname: `/cli-auth?session=${sessionId}` } },
      });
      return;
    }

    
    if (!sessionId) {
      setStatus('error');
      setError('Missing session parameter. Please use the link from your CLI.');
      return;
    }

    
    let cancelled = false;
    apiClient.get(`/api/cli/login/session?sessionId=${encodeURIComponent(sessionId)}`)
      .then((session) => {
        if (cancelled) return;
        if (session.status !== 'pending') throw new Error(`Session ${session.status}`);
        setVerificationCode(session.verificationCode);
        setStatus('confirm');
      })
      .catch((err) => {
        if (!cancelled) { setError(err.message); setStatus('error'); }
      });
    return () => { cancelled = true; };
  }, [user, authLoading, sessionId]);

  async function claimSession() {
    if (status !== 'confirm') return;
    setStatus('claiming');
    try {
      await apiClient.post('/api/cli/login/claim', { sessionId });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Failed to authorize CLI session.');
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-[420px] bg-[#E9E9E9] rounded-figma p-7 sm:p-8 border border-[#D1D1D1]/70 flex flex-col gap-6">
        
        <div className="flex flex-col items-center text-center gap-2 pt-1">
          <Logo to="/" />
          <div className="flex items-center gap-2 mt-1">
            <Terminal className="w-3.5 h-3.5 text-[#8C8C8C]" />
            <p className="text-xs text-[#8C8C8C] font-medium">
              CLI Authentication
            </p>
          </div>
        </div>

        
        <div className="flex flex-col items-center text-center gap-4 py-4">
          {(status === 'loading' || status === 'claiming') && (
            <>
              <div className="w-12 h-12 rounded-full bg-[#E9E9E9] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#303030]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#303030]">
                  {status === 'loading' ? 'Loading...' : 'Authorizing CLI...'}
                </p>
                <p className="text-xs text-[#8C8C8C] mt-1">
                  Please wait a moment
                </p>
              </div>
            </>
          )}

          {status === 'confirm' && (
            <>
              <p className="text-sm font-semibold text-[#303030]">Authorize this terminal?</p>
              <p className="text-xs text-[#8C8C8C]">Check that this code matches the one in your terminal.</p>
              <p className="font-mono text-2xl font-bold tracking-widest text-[#303030]">{verificationCode}</p>
              <p className="text-xs text-[#8C8C8C]">Signed in as {user?.email}</p>
              <button type="button" onClick={claimSession} className="w-full py-3 rounded-figma bg-[#303030] text-white font-semibold text-sm hover:bg-black transition-colors duration-150">
                Authorize CLI
              </button>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-12 h-12 rounded-full bg-sidebar flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-ink" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#303030]">
                  You're signed in to the CLI
                </p>
                <p className="text-xs text-[#8C8C8C] mt-1">
                  You can close this tab and return to your terminal.
                </p>
              </div>
              <div className="w-full mt-2 bg-white border border-[#D1D1D1] rounded-figma px-4 py-3">
                <p className="text-xs text-[#8C8C8C] font-medium">Signed in as</p>
                <p className="text-sm font-semibold text-[#303030] mt-0.5">
                  {user?.email}
                </p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 rounded-full bg-sidebar flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#303030]">
                  Authorization failed
                </p>
                <p className="text-xs text-red-500 mt-1">
                  {error}
                </p>
              </div>
              <button
                onClick={() => window.close()}
                className="w-full mt-2 py-3 rounded-figma bg-[#303030] hover:bg-[#303030]/90 active:bg-black text-white font-semibold text-sm transition-colors duration-150 cursor-pointer"
              >
                Close
              </button>
            </>
          )}
        </div>

        
        <p className="text-center text-[11px] text-[#8C8C8C]">
          This authorization links your dockMore account to the CLI.
        </p>
      </div>
    </div>
  );
}
