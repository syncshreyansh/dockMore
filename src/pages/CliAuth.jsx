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

    
    claimSession();
  }, [user, authLoading, sessionId]);

  async function claimSession() {
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
    <div className="min-h-screen bg-[#E8E7E5] flex items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-[420px] bg-[#FAFAF9] rounded-[20px] p-7 sm:p-8 border border-[#D9D8D6]/70 flex flex-col gap-6">
        
        <div className="flex flex-col items-center text-center gap-2 pt-1">
          <Logo to="/" />
          <div className="flex items-center gap-2 mt-1">
            <Terminal className="w-3.5 h-3.5 text-[#8A8785]" />
            <p className="text-xs text-[#8A8785] font-medium">
              CLI Authentication
            </p>
          </div>
        </div>

        
        <div className="flex flex-col items-center text-center gap-4 py-4">
          {(status === 'loading' || status === 'claiming') && (
            <>
              <div className="w-12 h-12 rounded-full bg-[#E8E7E5] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#1A1A1A]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  {status === 'loading' ? 'Loading...' : 'Authorizing CLI...'}
                </p>
                <p className="text-xs text-[#8A8785] mt-1">
                  Please wait a moment
                </p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  You're signed in to the CLI
                </p>
                <p className="text-xs text-[#8A8785] mt-1">
                  You can close this tab and return to your terminal.
                </p>
              </div>
              <div className="w-full mt-2 bg-white border border-[#D9D8D6] rounded-[12px] px-4 py-3">
                <p className="text-xs text-[#8A8785] font-medium">Signed in as</p>
                <p className="text-sm font-semibold text-[#1A1A1A] mt-0.5">
                  {user?.email}
                </p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  Authorization failed
                </p>
                <p className="text-xs text-red-500 mt-1">
                  {error}
                </p>
              </div>
              <button
                onClick={() => window.close()}
                className="w-full mt-2 py-3 rounded-full bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 active:bg-black text-white font-semibold text-sm transition-colors duration-150 cursor-pointer"
              >
                Close
              </button>
            </>
          )}
        </div>

        
        <p className="text-center text-[11px] text-[#8A8785]">
          This authorization links your dockMore account to the CLI.
        </p>
      </div>
    </div>
  );
}
