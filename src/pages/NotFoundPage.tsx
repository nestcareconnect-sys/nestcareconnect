import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowRight, ShieldAlert } from 'lucide-react';
import { SEO } from '../components/common/SEO';

export const NotFoundPage: React.FC = () => {
  return (
    <>
      <SEO title="Page Not Found | Nest Care Connect" />
      <div className="min-h-[70vh] bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-100 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#F1FAF3] text-[#237A3B] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <span className="text-4xl font-extrabold text-[#237A3B]">404</span>
          <h1 className="text-xl font-bold text-gray-900">Page Not Found</h1>
          <p className="text-xs text-gray-500">
            The page or healthcare product you are looking for might have moved or is temporarily unavailable.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#237A3B] text-white text-xs font-semibold rounded-xl"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Back Home</span>
            </Link>
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gray-100 text-gray-800 text-xs font-semibold rounded-xl"
            >
              <span>Browse Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
