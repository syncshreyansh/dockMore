import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/ui/Logo';

export default function SignIn() {
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      const returnPath = `${from}${location.state?.from?.search || ''}${location.state?.from?.hash || ''}`;
      await signInWithGoogle(new URL(returnPath, window.location.origin).toString());
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-[420px] bg-[#E9E9E9] rounded-figma p-7 sm:p-8 border border-[#D1D1D1]/70 flex flex-col gap-6">
        
        <div className="flex flex-col items-center text-center gap-2 pt-1">
          <Logo to="/signin" />
          <p className="text-xs text-[#8C8C8C] font-medium mt-1">
            Sign in to your cloud workspace.
          </p>
        </div>

        
        {error && (
          <div role="alert" className="dm-notice">
            {error}
          </div>
        )}

        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-[#303030]" htmlFor="signin-email">
              Email
            </label>
            <input
              id="signin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-figma border-0 bg-white px-4 py-2.5 text-sm text-[#303030] placeholder:text-[#8C8C8C]"
            />
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#303030]" htmlFor="signin-password">
                Password
              </label>
            </div>
            <input
              id="signin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-figma border-0 bg-white px-4 py-2.5 text-sm text-[#303030] placeholder:text-[#8C8C8C]"
            />
          </div>

          
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full mt-2 py-3 rounded-figma bg-[#303030] hover:bg-[#303030]/90 active:bg-black text-white font-semibold text-sm transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        
        <div className="relative flex items-center justify-center my-0.5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#D1D1D1]" />
          </div>
          <span className="relative bg-[#E9E9E9] px-3 text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C]">
            or
          </span>
        </div>

        
        <button
          type="button"
          disabled={loading || googleLoading}
          onClick={handleGoogleSignIn}
          className="w-full py-2.5 rounded-figma border border-[#D1D1D1] bg-transparent text-[#303030] hover:bg-black/5 active:bg-black/10 flex items-center justify-center gap-2.5 font-semibold text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#303030]" />
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        
        <p className="text-center text-xs text-[#8C8C8C]">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-semibold text-[#303030] hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
