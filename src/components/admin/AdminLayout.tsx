import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Gift,
  Sparkles,
  ShoppingBag,
  Users,
  Tag,
  DollarSign,
  Truck,
  Image as ImageIcon,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  Box,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { useAuth } from '../../context/AuthContext';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, login, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Products', path: '/admin/products', icon: Package },
    { label: 'Categories', path: '/admin/categories', icon: FolderTree },
    { label: 'Hampers', path: '/admin/hampers', icon: Gift },
    { label: 'Hamper Boxes', path: '/admin/boxes', icon: Box },
    { label: 'Custom Hamper Rules', path: '/admin/custom-hampers', icon: Sparkles },
    { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
    { label: 'Customers', path: '/admin/customers', icon: Users },
    { label: 'Coupons & Discounts', path: '/admin/coupons', icon: Tag },
    { label: 'Currencies & Rates', path: '/admin/currencies', icon: DollarSign },
    { label: 'Shipping Rules', path: '/admin/shipping', icon: Truck },
    { label: 'Hero Banner Slides', path: '/admin/hero-slides', icon: ImageIcon },
    { label: 'General Settings', path: '/admin/settings', icon: Settings },
  ];

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-200 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-[#237A3B]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Admin Access Required</h2>
          <p className="text-xs text-gray-500">
            This management console is restricted to authenticated Nest Care Connect administrators.
          </p>
          
          <div className="pt-2 space-y-2.5">
            <button
              disabled={isLoggingIn}
              onClick={async () => {
                setIsLoggingIn(true);
                try {
                  await login({ email: 'admin@nestcareconnect.com', password: 'Admin@123456' });
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsLoggingIn(false);
                }
              }}
              className="w-full py-2.5 bg-[#237A3B] hover:bg-[#1c6330] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isLoggingIn ? 'Authenticating Admin...' : '⚡ 1-Click Login as Admin (Dr. Sarah)'}</span>
            </button>

            <div className="flex justify-center gap-2 pt-1">
              <Link
                to="/login?redirect=/admin/products"
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl text-center transition-colors"
              >
                Sign In with Credentials
              </Link>
              <Link
                to="/"
                className="px-4 py-2 text-gray-500 hover:text-gray-800 text-xs font-medium rounded-xl text-center"
              >
                Back to Store
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col md:flex-row">
      {/* Mobile Top Navbar */}
      <div className="md:hidden bg-gray-900 text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <Logo variant="white" />
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-gray-400 hover:text-white"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Admin Sidebar (Desktop + Mobile Drawer) */}
      <aside
        className={`fixed md:sticky top-0 z-40 inset-y-0 left-0 w-64 md:h-screen md:min-h-screen bg-gray-900 text-gray-300 flex flex-col justify-between border-r border-gray-800 transition-transform duration-200 overflow-hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-5 space-y-6">
          <div className="hidden md:flex items-center justify-between">
            <Logo variant="white" />
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-gray-800/80 border border-gray-700/60 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#8BCF9B] animate-pulse" />
              <span className="font-semibold text-white">Admin Console</span>
            </div>
            <span className="text-[10px] text-[#8BCF9B] font-mono">v1.0.0</span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#237A3B] text-white font-bold shadow-xs'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer info in sidebar */}
        <div className="p-4 border-t border-gray-800 space-y-3">
          <div className="text-xs">
            <span className="text-gray-400 block text-[10px]">Logged in as:</span>
            <span className="font-semibold text-white truncate block">{user?.name}</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Link
              to="/"
              target="_blank"
              className="flex items-center gap-1.5 text-xs text-[#8BCF9B] hover:underline"
            >
              <span>View Store</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-8 lg:p-10 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
