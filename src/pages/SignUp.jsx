import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/ui/Logo';

export default function SignUp() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmationNotice, setConfirmationNotice] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await signUp(email, password, name);
      
      if (data?.user && !data?.session) {
        setConfirmationNotice(true);
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-up failed');
      setGoogleLoading(false);
    }
  };

  if (confirmationNotice) {
    return (
      <div className="min-h-screen bg-[#E8E7E5] flex items-center justify-center p-4 font-sans select-none">
        <div className="w-full max-w-[420px] bg-[#FAFAF9] rounded-[20px] p-7 sm:p-8 border border-[#D9D8D6]/70 flex flex-col gap-6 text-center">
          <div className="flex flex-col items-center gap-2 pt-1">
            <Logo to="/signin" />
            <h3 className="text-base font-bold text-[#1A1A1A] mt-2">Check your email</h3>
            <p className="text-xs text-[#8A8785] leading-relaxed">
              We've sent a confirmation link to <strong className="text-[#1A1A1A]">{email}</strong>.
              Click the link in your email to activate your account and start using dockMore.
            </p>
          </div>
          <Link
            to="/signin"
            className="w-full py-3 rounded-full bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 text-white font-semibold text-sm transition-colors duration-150 inline-block text-center"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8E7E5] flex items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-[420px] bg-[#FAFAF9] rounded-[20px] p-7 sm:p-8 border border-[#D9D8D6]/70 flex flex-col gap-6">
        {/* Wordmark Header */}
        <div className="flex flex-col items-center text-center gap-2 pt-1">
          <Logo to="/signup" />
          <p className="text-xs text-[#8A8785] font-medium mt-1">
            Create your unified storage aggregator account
          </p>
        </div>

        {/* Error notice */}
        {error && (
          <div className="bg-red-50/80 border border-red-200 rounded-[12px] p-3 text-xs text-red-600 leading-tight">
            {error}
          </div>
        )}

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-[#1A1A1A]" htmlFor="signup-name">
              Full Name
            </label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Shreyansh Singh"
              required
              className="w-full rounded-[12px] border border-[#D9D8D6] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#8A8785] outline-none focus:border-[#1A1A1A] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-[#1A1A1A]" htmlFor="signup-email">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-[12px] border border-[#D9D8D6] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#8A8785] outline-none focus:border-[#1A1A1A] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-[#1A1A1A]" htmlFor="signup-password">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••• (min 6 characters)"
              required
              minLength={6}
              className="w-full rounded-[12px] border border-[#D9D8D6] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#8A8785] outline-none focus:border-[#1A1A1A] transition-colors"
            />
          </div>

          {/* Solid Primary Button */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full mt-2 py-3 rounded-full bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 active:bg-black text-white font-semibold text-sm transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-0.5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#D9D8D6]" />
          </div>
          <span className="relative bg-[#FAFAF9] px-3 text-[11px] font-medium uppercase tracking-wider text-[#8A8785]">
            or
          </span>
        </div>

        {/* Ghost Google Button with 1px border */}
        <button
          type="button"
          disabled={loading || googleLoading}
          onClick={handleGoogleSignIn}
          className="w-full py-2.5 rounded-full border border-[#D9D8D6] bg-transparent text-[#1A1A1A] hover:bg-black/5 active:bg-black/10 flex items-center justify-center gap-2.5 font-semibold text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#1A1A1A]" />
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

        {/* Footer link to sign in */}
        <p className="text-center text-xs text-[#8A8785]">
          Already have an account?{' '}
          <Link
            to="/signin"
            className="font-semibold text-[#1A1A1A] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
