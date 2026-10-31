import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  Phone,
  CheckCircle2,
  RotateCcw,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Logo } from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../services/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/account';

  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerificationEmail, setNeedsVerificationEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);
    setNeedsVerificationEmail(null);
    try {
      await login({ email, password });
      showToast('Welcome back to Nest Care Connect!', 'success');
      navigate(redirect);
    } catch (err: any) {
      if (err.response?.data?.requiresEmailVerification) {
        setNeedsVerificationEmail(err.response.data.email || email.trim());
        setError(err.response?.data?.message || 'Please verify your email address to log in.');
      } else {
        setError(err.response?.data?.message || 'Invalid email or password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO title="Sign In | Nest Care Connect" description="Sign in to your Nest Care Connect account." />

      <div className="min-h-screen bg-[#E3F5E8] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <Logo className="justify-center mb-4" />
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Sign In to Your Account
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Access past health orders, saved addresses, and express checkout.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-6 shadow-md rounded-3xl border border-[#E5E7EB] sm:px-10 space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                  <span>{error}</span>
                </div>
                {needsVerificationEmail && (
                  <div className="pt-1">
                    <Link
                      to={`/verify-email?email=${encodeURIComponent(needsVerificationEmail)}`}
                      className="inline-flex items-center gap-1.5 font-bold text-xs text-[#237A3B] hover:text-[#1C6330] underline"
                    >
                      Enter 6-Digit Verification Code &rarr;
                    </Link>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. user@example.com"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-[#E3F5E8] border border-[#E5E7EB] rounded-xl focus:border-[#8BCF9B] outline-none"
                  />
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-[#E3F5E8] border border-[#E5E7EB] rounded-xl focus:border-[#8BCF9B] outline-none"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <Link to="/forgot-password" className="text-[#237A3B] hover:underline font-semibold">
                  Forgot Password?
                </Link>
                <Link to="/contact" className="text-gray-500 hover:underline">
                  Need Help?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#237A3B] hover:bg-[#1C6330] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="border-t border-[#E5E7EB] pt-3 text-center">
              <span className="text-xs text-gray-500">Don't have an account yet? </span>
              <Link to="/register" className="text-xs font-bold text-[#237A3B] hover:underline">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, refreshUser } = useAuth();
  const { showToast } = useToast();

  // Registration Step: 'FORM' | 'OTP' | 'SUCCESS'
  const [step, setStep] = useState<'FORM' | 'OTP' | 'SUCCESS'>('FORM');

  // Step 1: Account Details Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: 6-Digit Email OTP
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 60-second Resend Cooldown
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // 15-Minute Expiration Countdown
  const [expiresInSeconds, setExpiresInSeconds] = useState(15 * 60);

  // Timers for OTP step
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'OTP' && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'OTP' && expiresInSeconds > 0) {
      timer = setInterval(() => {
        setExpiresInSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, expiresInSeconds]);

  // Handle Step 1 Submit: Register Account & Dispatch MSG91 OTP
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      setError('Please fill in all required fields including your phone number.');
      return;
    }

    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      setError('Please enter a valid phone number (7 to 15 digits, e.g. +91 8921342411).');
      return;
    }

    if (password.length < 12) {
      setError('Password must be at least 12 characters long for account security.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.initiateRegister({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });

      if (res.data?.success) {
        showToast('Verification code sent! Please verify your email to complete registration.', 'success');
        setStep('OTP');
        setResendCooldown(60);
        setCanResend(false);
        setExpiresInSeconds(15 * 60);
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 150);
      } else {
        setError(res.data?.message || 'Failed to send verification code. Please check your details.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...otpDigits];
      next[index] = '';
      setOtpDigits(next);
      return;
    }

    const digit = cleaned.slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const next = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || '';
    }
    setOtpDigits(next);

    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();

    if (pasted.length === 6) {
      handleVerifyOtp(undefined, pasted);
    }
  };

  // Handle Step 2 Submit: Verify 6-digit Email OTP and Complete Account Creation
  const handleVerifyOtp = async (e?: React.FormEvent, customOtp?: string) => {
    if (e) e.preventDefault();
    const fullOtp = customOtp || otpDigits.join('');

    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const res = await authApi.completeRegister({
        email: email.trim(),
        otp: fullOtp,
      });

      if (res.data?.success && res.data?.data) {
        const { token: receivedToken } = res.data.data;
        if (receivedToken) {
          localStorage.setItem('ncc_token', receivedToken);
        }
        setStep('SUCCESS');
        showToast('Email verified and account registered successfully! Welcome to Nest Care Connect.', 'success');
        if (refreshUser) {
          await refreshUser().catch(() => {});
        }
        setTimeout(() => {
          navigate('/account');
        }, 2200);
      } else {
        setError(res.data?.message || 'Verification failed. Please check the code.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Resend Verification Code
  const handleResendOtp = async () => {
    if (!canResend || isResending) return;
    setIsResending(true);
    setError(null);

    try {
      const res = await authApi.resendVerificationEmail({ email: email.trim() });
      showToast(res.data?.message || 'New 6-digit verification code sent to your email!', 'success');
      setResendCooldown(60);
      setCanResend(false);
      setExpiresInSeconds(15 * 60);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <SEO
        title={step === 'OTP' ? 'Verify Email Code | Nest Care Connect' : 'Create Account | Nest Care Connect'}
        description="Create your Nest Care Connect account with email verification."
      />

      <div className="min-h-screen bg-[#E3F5E8] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <Logo className="justify-center mb-4" />
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            {step === 'OTP' ? 'Verify Your Email' : step === 'SUCCESS' ? 'Welcome to Nest Care!' : 'Create Your Account'}
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            {step === 'OTP'
              ? `Enter the 6-digit code sent to ${email}`
              : step === 'SUCCESS'
              ? 'Your email is verified and your account is active.'
              : 'Join Nest Care Connect to send healthcare packages and hampers to loved ones.'}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-6 shadow-md rounded-3xl border border-[#E5E7EB] sm:px-10 space-y-6">
            {/* Step Indicators */}
            <div className="flex items-center justify-center gap-3 pb-2 border-b border-[#E5E7EB] text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#237A3B]">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${step === 'FORM' ? 'bg-[#237A3B]' : 'bg-[#237A3B]'}`}>
                  {step === 'FORM' ? '1' : '✓'}
                </span>
                <span>Account Info</span>
              </div>
              <span className="text-gray-300">───</span>
              <div className={`flex items-center gap-1.5 font-bold ${step === 'OTP' || step === 'SUCCESS' ? 'text-[#237A3B]' : 'text-gray-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 'SUCCESS' ? 'bg-[#237A3B] text-white' : step === 'OTP' ? 'bg-[#237A3B] text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step === 'SUCCESS' ? '✓' : '2'}
                </span>
                <span>Email OTP</span>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: ACCOUNT DETAILS FORM */}
            {step === 'FORM' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-[#E3F5E8] border border-[#E5E7EB] rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. rajesh@example.com"
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-[#E3F5E8] border border-[#E5E7EB] rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    We will send an OTP verification code to this address.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 8921342411"
                      required
                      autoComplete="tel"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-[#E3F5E8] border border-[#E5E7EB] rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Used for courier delivery updates, WhatsApp gift keepsakes, and tracking.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      minLength={12}
                      className="w-full pl-9 pr-10 py-2.5 text-xs bg-[#E3F5E8] border border-[#E5E7EB] rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Minimum 12 characters for account security.</p>
                </div>

                <div className="p-3 bg-[#F1FAF3]/70 border border-[#E5E7EB] rounded-xl flex items-center gap-2 text-[11px] text-[#1A5B2C]">
                  <ShieldCheck className="w-4 h-4 text-[#237A3B] shrink-0" />
                  <span>Your email will be verified using MSG91 secure OTP.</span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#237A3B] hover:bg-[#1C6330] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account & Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Email Verification</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: IN-PAGE 6-DIGIT EMAIL OTP VERIFICATION */}
            {step === 'OTP' && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-[#F1FAF3] text-[#237A3B] flex items-center justify-center mx-auto mb-2 border border-[#E5E7EB]">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-gray-600">
                    We sent a 6-digit verification code to:
                  </p>
                  <p className="text-sm font-bold text-gray-900 font-mono">
                    {email}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('FORM');
                      setError(null);
                    }}
                    className="text-[11px] text-[#237A3B] hover:underline font-semibold inline-block pt-1 cursor-pointer"
                  >
                    Wrong email? Edit details
                  </button>
                </div>

                {/* 6 Digit Inputs */}
                <div>
                  <label className="block text-center text-xs font-semibold text-gray-700 mb-3">
                    Enter 6-Digit Verification Code
                  </label>
                  <div className="flex justify-center gap-2 sm:gap-2.5">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          inputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onPaste={handlePaste}
                        className="w-10 h-12 sm:w-12 sm:h-14 text-center font-mono text-lg sm:text-xl font-bold bg-[#E3F5E8] border-2 border-[#E5E7EB] rounded-xl focus:border-[#237A3B] focus:bg-white outline-none transition-all shadow-2xs"
                      />
                    ))}
                  </div>
                </div>

                {/* Expiration Timer & Resend Button */}
                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <span className="text-gray-400 text-[11px]">
                    Expires in: <strong className="text-gray-700 font-mono">{formatTime(expiresInSeconds)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={!canResend || isResending}
                    className="text-[#237A3B] font-semibold hover:underline flex items-center gap-1 disabled:opacity-40 disabled:no-underline cursor-pointer text-[11px]"
                  >
                    <RotateCcw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                    <span>
                      {isResending
                        ? 'Resending...'
                        : canResend
                        ? 'Resend Code'
                        : `Resend in ${resendCooldown}s`}
                    </span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isVerifying || otpDigits.join('').length !== 6}
                  className="w-full py-3 bg-[#237A3B] hover:bg-[#1C6330] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Complete Registration</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 3: SUCCESS CELEBRATION */}
            {step === 'SUCCESS' && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#F1FAF3] text-[#237A3B] flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900">Email Verified Successfully!</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Your Nest Care Connect account is active and verified. Redirecting you to your account...
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/account')}
                    className="w-full py-2.5 bg-[#237A3B] hover:bg-[#1C6330] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Go to My Account Now
                  </button>
                </div>
              </div>
            )}

            {step !== 'SUCCESS' && (
              <div className="border-t border-[#E5E7EB] pt-4 text-center">
                <span className="text-xs text-gray-500">Already registered? </span>
                <Link to="/login" className="text-xs font-bold text-[#237A3B] hover:underline">
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

