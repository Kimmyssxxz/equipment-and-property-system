'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, XCircle } from 'lucide-react';
import { StorageManager } from '@/lib/storage';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Field-specific validation error states
  const [fieldErrors, setFieldErrors] = useState({ username: '', password: '' });

  // Live password rules status
  const isPassLengthValid = password.length >= 6;
  const isPassMixCaseValid = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const isPassNumberValid = /\d/.test(password);

  // Input Validation logic
  const validateForm = () => {
    const errors = { username: '', password: '' };
    let isValid = true;

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      errors.username = 'Username is required.';
      isValid = false;
    } else if (trimmedUser.length < 3) {
      errors.username = 'Username must be at least 3 characters long.';
      isValid = false;
    } else if (!/^[a-zA-Z0-9_.-@]+$/.test(trimmedUser)) {
      errors.username = 'Username contains invalid special characters.';
      isValid = false;
    }

    if (!password) {
      errors.password = 'Password is required.';
      isValid = false;
    } else if (!isPassLengthValid) {
      errors.password = 'Password must be at least 6 characters long.';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleUsernameChange = (val) => {
    setUsername(val);
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: '' }));
    }
  };

  const handlePasswordChange = (val) => {
    setPassword(val);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: '' }));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Trigger validation check before network call
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Invalid Username or Password.');
        setIsLoading(false);
        return;
      }

      setSuccessMsg(data.message || 'Successfully logged in!');

      if (typeof window !== 'undefined') {
        StorageManager.setAuthenticated(true, data.user);
        localStorage.setItem('nfsti_user_session', JSON.stringify(data.user));
      }

      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 600);
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('Unable to connect to the authentication server.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-slate-100/70 font-sans selection:bg-emerald-600 selection:text-white">
      {/* 2-Column Split Login Card matching Reference Design */}
      <div className="relative z-10 w-full max-w-5xl bg-white/95 backdrop-blur-2xl border border-white/90 rounded-[32px] sm:rounded-[40px] shadow-2xl shadow-slate-900/10 p-6 sm:p-10 lg:p-12 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Branding & Large Lottie Illustration */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6 lg:border-r lg:border-slate-100 lg:pr-8">
            {/* Top Branding Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white p-1 flex items-center justify-center border border-slate-200 shadow-2xs shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/nfsti logo.png"
                  alt="NFSTI Official Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-black text-sm tracking-wide text-slate-900 uppercase block leading-none">
                  NFSTI SYSTEM
                </span>
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                  National Forensic Science Training Institute
                </span>
              </div>
            </div>

            {/* Central Animated Lottie Illustration */}
            <div className="w-full max-w-[340px] aspect-square relative mx-auto flex items-center justify-center overflow-hidden py-2">
              <iframe
                src="https://lottie.host/embed/9b70e019-e0c0-4c3d-89d6-5399ca8731a4/BnZGYh7qQ7.lottie"
                className="w-full h-full border-none pointer-events-none scale-125"
                title="Login Animation"
              />
            </div>
          </div>

          {/* Right Column: Hello Again & Login Form */}
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-center">
            {/* Greeting Header */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Hello Again!
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Welcome back, you've been missed.
              </p>
            </div>

            {/* Status Alerts */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              {/* Username Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Username</span>
                  {fieldErrors.username && (
                    <span className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      {fieldErrors.username}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="Enter your username"
                    className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-bold transition-all shadow-2xs placeholder:text-slate-400 ${
                      fieldErrors.username
                        ? 'bg-rose-50/60 border border-rose-400 text-rose-900 focus:outline-none focus:border-rose-500'
                        : 'bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Password Field with Real-time Live Validation */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Password</span>
                  {fieldErrors.password && (
                    <span className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      {fieldErrors.password}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full pl-10 pr-11 py-3 rounded-2xl text-xs font-bold transition-all shadow-2xs placeholder:text-slate-400 ${
                      fieldErrors.password
                        ? 'bg-rose-50/60 border border-rose-400 text-rose-900 focus:outline-none focus:border-rose-500'
                        : 'bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Real-time Live Password Requirement Checklist */}
                {password.length > 0 && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 animate-in fade-in duration-200">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                      Live Password Requirements:
                    </p>
                    <div className="grid grid-cols-1 gap-1 text-[11px]">
                      <div className={`flex items-center gap-1.5 font-medium transition-colors ${
                        isPassLengthValid ? 'text-emerald-700 font-bold' : 'text-slate-400'
                      }`}>
                        {isPassLengthValid ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                        )}
                        <span>At least 6 characters</span>
                      </div>

                      <div className={`flex items-center gap-1.5 font-medium transition-colors ${
                        isPassMixCaseValid ? 'text-emerald-700 font-bold' : 'text-slate-400'
                      }`}>
                        {isPassMixCaseValid ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                        )}
                        <span>Mix of uppercase & lowercase letters</span>
                      </div>

                      <div className={`flex items-center gap-1.5 font-medium transition-colors ${
                        isPassNumberValid ? 'text-emerald-700 font-bold' : 'text-slate-400'
                      }`}>
                        {isPassNumberValid ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                        )}
                        <span>At least 1 number</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Login Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] mt-4"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Authentication...</span>
                  </div>
                ) : (
                  <>
                    <span>Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer info */}
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-medium flex items-center justify-between">
              <span>Admin Portal Access</span>
              <span>© FY 2026 NFSTI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
