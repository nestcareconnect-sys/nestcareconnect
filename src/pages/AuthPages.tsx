import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, User, ShieldCheck, ArrowRight, AlertCircle, Phone } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Logo } from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);
    try {
      await login({ email, password });
      showToast('Welcome back to Nest Care Connect!', 'success');
      navigate(redirect);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO title="Sign In | Nest Care Connect" description="Sign in to your Nest Care Connect account." />

      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
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
          <div className="bg-white py-8 px-6 shadow-md rounded-3xl border border-gray-100 sm:px-10 space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
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
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
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
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Admin/Demo Credentials in Seed</span>
                <Link to="/contact" className="text-[#237A3B] hover:underline font-semibold">
                  Need Help?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick 1-Click Demo Login Box */}
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">
                Quick 1-Click Demo Logins
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setEmail('admin@nestcareconnect.com');
                    setPassword('Admin@123456');
                    setIsLoading(true);
                    setError(null);
                    try {
                      await login({ email: 'admin@nestcareconnect.com', password: 'Admin@123456' });
                      showToast('Logged in as Administrator (Dr. Sarah Mathews)', 'success');
                      navigate(redirect === '/account' ? '/admin/products' : redirect);
                    } catch (err: any) {
                      setError('Failed to login as admin.');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="p-2.5 rounded-xl bg-[#F1FAF3] hover:bg-[#E3F5E8] border border-[#8BCF9B] text-left transition-colors flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-[#237A3B] flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-[#237A3B]">Admin Console</div>
                    <div className="text-[10px] text-gray-500">Manage products & catalog</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setEmail('customer@nestcareconnect.com');
                    setPassword('User@123456');
                    setIsLoading(true);
                    setError(null);
                    try {
                      await login({ email: 'customer@nestcareconnect.com', password: 'User@123456' });
                      showToast('Logged in as Customer (Rajesh Sharma)', 'success');
                      navigate(redirect);
                    } catch (err: any) {
                      setError('Failed to login as customer.');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-left transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-gray-800">Customer Demo</div>
                    <div className="text-[10px] text-gray-500">Rajesh Sharma</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 text-center">
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
  const { register } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    setIsLoading(true);
    setError(null);
    try {
      await register({ name, email, phone, password });
      showToast('Account created successfully!', 'success');
      navigate('/account');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO title="Register Account | Nest Care Connect" description="Create your Nest Care Connect account." />

      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <Logo className="justify-center mb-4" />
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Create Your Account
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Join Nest Care Connect to manage healthcare orders for loved ones.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-6 shadow-md rounded-3xl border border-gray-100 sm:px-10 space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
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
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                  />
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                  />
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isLoading ? 'Creating account...' : 'Register'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="border-t border-gray-100 pt-4 text-center">
              <span className="text-xs text-gray-500">Already registered? </span>
              <Link to="/login" className="text-xs font-bold text-[#237A3B] hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
