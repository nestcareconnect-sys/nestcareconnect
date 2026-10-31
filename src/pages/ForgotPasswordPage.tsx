import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, RotateCcw, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Logo } from '../components/common/Logo';
import { authApi } from '../services/api';
import { useToast } from '../context/ToastContext';

type Step = 'EMAIL' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // 5-minute countdown timer (300 seconds) for OTP validity
  const [timeLeft, setTimeLeft] = useState(300);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'OTP' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  useEffect(() => {
    let resendTimer: NodeJS.Timeout;
    if (step === 'OTP' && resendCooldown > 0) {
      resendTimer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(resendTimer);
  }, [step, resendCooldown]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Step 1: Submit Email to send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.sendForgotPasswordOtp({ email: email.trim() });
      setInfoMessage(res.data?.message || 'If an account exists with this email address, a 6-digit OTP has been sent.');
      setTimeLeft(300);
      setResendCooldown(30);
      setCanResend(false);
      setStep('OTP');
      showToast('Verification code dispatched to your email.', 'info');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setError('Please enter the 6-digit numerical code received in your email.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.verifyResetOtp({
        email: email.trim(),
        otp: cleanOtp,
      });

      if (res.data?.success && res.data.resetToken) {
        setResetToken(res.data.resetToken);
        setStep('NEW_PASSWORD');
        showToast('Code verified successfully! Now choose your new password.', 'success');
      } else {
        setError(res.data?.message || 'Invalid or expired verification code.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP action
  const handleResendOtp = async () => {
    if (!canResend || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.sendForgotPasswordOtp({ email: email.trim() });
      showToast('A new 6-digit verification code has been sent.', 'success');
      setInfoMessage(res.data?.message || 'A new verification code has been dispatched to your email.');
      setTimeLeft(300);
      setResendCooldown(30);
      setCanResend(false);
      setOtp('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Complete Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 12) {
      setError('New password must be at least 12 characters long for account security.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify your new password.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.completePasswordReset({
        resetToken,
        newPassword,
      });
      if (res.data?.success) {
        setStep('SUCCESS');
        showToast('Password reset successful! You can now log in.', 'success');
      } else {
        setError(res.data?.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Authorization may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO title="Reset Password | Nest Care Connect" description="Reset your Nest Care Connect password securely via email OTP." />

      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <Logo className="justify-center mb-4" />
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            {step === 'SUCCESS' ? 'Password Reset Complete' : 'Reset Your Password'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {step === 'EMAIL' && 'Enter your registered email address to receive a secure 6-digit verification code.'}
            {step === 'OTP' && `Enter the 6-digit code sent to ${email}`}
            {step === 'NEW_PASSWORD' && 'Create a strong, new password of at least 12 characters.'}
            {step === 'SUCCESS' && 'Your account password has been updated securely.'}
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

            {infoMessage && step === 'OTP' && !error && (
              <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 flex items-start gap-2.5 text-xs text-green-800">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* STEP 1: Enter Email */}
            {step === 'EMAIL' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Registered Email Address *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. user@example.com"
                      required
                      autoFocus
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Generating code...' : 'Send Verification OTP'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* STEP 2: Verify 6-digit OTP */}
            {step === 'OTP' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      6-Digit Verification Code *
                    </label>
                    <span className={`text-[11px] font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-gray-500'}`}>
                      Expires in: {formatTimer(timeLeft)}
                    </span>
                  </div>
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
                    Check your spam or junk folder if you do not see the message in your inbox.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6 || timeLeft === 0}
                  className="w-full py-3 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Verifying OTP...' : 'Verify Code & Proceed'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('EMAIL');
                      setError(null);
                    }}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    Change Email
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={!canResend || isLoading}
                    className={`font-semibold flex items-center gap-1 ${
                      canResend ? 'text-[#237A3B] hover:underline' : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{canResend ? 'Resend OTP' : `Resend in ${resendCooldown}s`}</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Enter New Password */}
            {step === 'NEW_PASSWORD' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 12 characters"
                      required
                      minLength={12}
                      className="w-full pl-9 pr-10 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
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
                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    <span className={newPassword.length >= 12 ? 'text-green-600 font-bold' : 'text-gray-400'}>
                      {newPassword.length >= 12 ? '✓ 12+ characters' : '• Must be at least 12 characters'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      required
                      minLength={12}
                      className="w-full pl-9 pr-10 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[11px] text-red-500 mt-1">Passwords do not match.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || newPassword.length < 12 || newPassword !== confirmPassword}
                  className="w-full py-3 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Updating password...' : 'Save New Password'}</span>
                  <ShieldCheck className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* STEP 4: Success */}
            {step === 'SUCCESS' && (
              <div className="text-center space-y-4 py-2">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border-2 border-green-200">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Password Changed Successfully!</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Your password has been updated. You can now sign in with your new credentials.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="w-full py-3 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 text-center">
              <span className="text-xs text-gray-500">Remembered your password? </span>
              <Link to="/login" className="text-xs font-bold text-[#237A3B] hover:underline">
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
