import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ArrowRight, AlertCircle, CheckCircle2, RotateCcw, KeyRound, ShieldCheck } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Logo } from '../components/common/Logo';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const queryEmail = searchParams.get('email') || user?.email || '';
  const queryOtp = searchParams.get('otp') || '';
  const queryToken = searchParams.get('token') || '';

  const [email, setEmail] = useState(queryEmail);
  const [otp, setOtp] = useState(queryOtp);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // 60-second resend cooldown
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
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
  }, [resendCooldown]);

  // Auto-verify if email and token/otp are present in URL query params
  useEffect(() => {
    if (queryEmail && (queryOtp || queryToken) && !isSuccess) {
      handleVerify(undefined, queryEmail, queryOtp, queryToken);
    }
  }, [queryEmail, queryOtp, queryToken]);

  const handleVerify = async (
    e?: React.FormEvent,
    targetEmail?: string,
    targetOtp?: string,
    targetToken?: string
  ) => {
    if (e) e.preventDefault();

    const cleanEmail = (targetEmail || email).trim();
    const cleanOtp = (targetOtp || otp).trim();
    const cleanToken = (targetToken || queryToken).trim();

    if (!cleanEmail) {
      setError('Please provide your registered email address.');
      return;
    }

    if (!cleanOtp && !cleanToken) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await authApi.verifyEmail({
        email: cleanEmail,
        otp: cleanOtp || undefined,
        token: cleanToken || undefined,
      });

      if (res.data?.success) {
        setIsSuccess(true);
        showToast('Email verified successfully!', 'success');
        if (refreshUser) {
          refreshUser().catch(() => {});
        }
      } else {
        setError(res.data?.message || 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !canResend || isResending) return;

    setIsResending(true);
    setError(null);
    try {
      const res = await authApi.resendVerificationEmail({ email: cleanEmail });
      showToast('A fresh verification code has been dispatched to your email.', 'success');
      setResendCooldown(60);
      setCanResend(false);
      setOtp('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <SEO title="Verify Email | Nest Care Connect" description="Verify your Nest Care Connect email address." />

      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <Logo className="justify-center mb-4" />
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            {isSuccess ? 'Email Verified Successfully!' : 'Verify Your Email Address'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {isSuccess
              ? 'Thank you for verifying your email with Nest Care Connect.'
              : `We sent a 6-digit verification code to ${email || 'your email address'}.`}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-6 shadow-md rounded-3xl border border-gray-100 sm:px-10 space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {!isSuccess ? (
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. user@example.com"
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    6-Digit Verification Code *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      required
                      autoFocus
                      className="w-full text-center text-lg tracking-[8px] font-mono py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                    <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Check your spam or promotion folders if you don't see it within 1 minute.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="w-full py-3 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Verifying...' : 'Verify Email Address'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={!canResend || isResending}
                    className={`text-xs font-semibold flex items-center gap-1.5 ${
                      canResend ? 'text-[#237A3B] hover:underline' : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{canResend ? 'Resend Verification Email' : `Resend in ${resendCooldown}s`}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-4 py-2">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border-2 border-green-200">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Email Address Confirmed</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Your email address is verified. You will receive live courier tracking milestones, delivery updates, and order confirmations.
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <Link
                    to="/account"
                    className="w-full py-3 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>Go to My Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/shop"
                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-3 text-center">
              <Link to="/account" className="text-xs text-gray-500 hover:text-gray-800">
                Back to Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
