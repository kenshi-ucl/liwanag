import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Mail, Lock, Loader2 } from 'lucide-react';

import logoImg from '../logo.png';

export const Route = createFileRoute('/signin')({
  component: SignInPage,
});

function SignInPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/signin';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('liwanag_user', JSON.stringify(data.user));
      navigate({ to: '/dashboard' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Space Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#1a1a3e] via-[#2d1b4e] to-[#1a1a3e]">
        {/* Stars */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(80)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white animate-pulse"
              style={{
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.8 + 0.2,
                animationDuration: `${Math.random() * 3 + 2}s`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Large Cyan Planet */}
        <div className="absolute -left-20 top-10 w-72 h-72">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-600 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="absolute top-1/4 left-0 right-0 h-6 bg-cyan-200/30 blur-sm" />
            <div className="absolute top-1/3 left-0 right-0 h-3 bg-white/10 blur-sm" />
          </div>
        </div>

        {/* Medium Purple Planet */}
        <div className="absolute left-32 bottom-32 w-28 h-28">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-300 via-purple-400 to-purple-600 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/20 rounded-full" />
          </div>
        </div>

        {/* Small Pink Planet */}
        <div className="absolute right-16 bottom-48 w-16 h-16">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-pink-300 via-pink-400 to-pink-600 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/20 rounded-full" />
          </div>
        </div>

        {/* Shooting Stars */}
        <div className="absolute top-1/4 right-16 w-24 h-0.5 bg-gradient-to-r from-white to-transparent transform -rotate-45 opacity-60" />
        <div className="absolute top-1/3 right-32 w-16 h-0.5 bg-gradient-to-r from-white to-transparent transform -rotate-45 opacity-40" />
        <div className="absolute bottom-1/3 right-8 w-20 h-0.5 bg-gradient-to-r from-white to-transparent transform -rotate-45 opacity-50" />

        {/* Logo */}
        <div className="absolute top-8 left-8 flex items-center gap-2">
          <img src={logoImg} alt="Liwanag" className="w-10 h-10 rounded-lg" />
          <span className="text-white text-xl font-semibold">Liwanag</span>
        </div>

        {/* Bottom Text */}
        <div className="absolute bottom-16 left-8">
          <h2 className="text-3xl font-bold text-white leading-tight">
            SIGN IN TO YOUR
          </h2>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            ADVENTURE!
          </h2>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gradient-to-br from-[#1a1a3e] via-[#2d1b4e] to-[#1a1a3e] p-8">
        <div className="w-full max-w-md">
          <h1 className="text-5xl font-bold text-white mb-2">
            {isSignUp ? 'SIGN UP' : 'SIGN IN'}
          </h1>
          <p className="text-gray-400 mb-8">
            {isSignUp ? 'Create your account' : 'Sign in with email address'}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Yourname@gmail.com"
                className="w-full pl-12 pr-4 py-4 bg-[#2a2a5a]/50 border border-[#3a3a7a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-12 pr-4 py-4 bg-[#2a2a5a]/50 border border-[#3a3a7a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {isSignUp && (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full pl-12 pr-4 py-4 bg-[#2a2a5a]/50 border border-[#3a3a7a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (
                isSignUp ? 'Sign up' : 'Sign in'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#3a3a7a]" />
            <span className="text-gray-500 text-sm">Or continue with</span>
            <div className="flex-1 h-px bg-[#3a3a7a]" />
          </div>

          {/* Social Buttons */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                window.location.href = '/api/auth/github';
              }}
              className="flex items-center justify-center gap-3 py-3 px-8 bg-[#24292e] border border-[#3a3a7a] rounded-xl text-white hover:bg-[#2f363d] transition-colors w-full"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>
          </div>

          {/* Terms */}
          <p className="text-center text-gray-500 text-sm mt-6">
            By registering you with our{' '}
            <a href="#" className="text-purple-400 hover:text-purple-300">Terms and Conditions</a>
          </p>

          {/* Toggle */}
          <p className="text-center text-gray-400 mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
              className="text-purple-400 hover:text-purple-300 font-medium"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>

        </div>
      </div>
    </div>
  );
}
