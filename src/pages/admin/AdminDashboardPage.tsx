import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Package,
  Users,
  TrendingUp,
  FolderTree,
  Gift,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle2,
  Box,
} from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { adminApi } from '../../services/api';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getStats()
      .then((res) => {
        if (res.data?.success && res.data.data) {
          setStats(res.data.data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const metrics = stats?.metrics || {
    totalOrders: 0,
    pendingOrders: 0,
    paidOrders: 0,
    totalRevenueINR: 0,
    totalProducts: 0,
    totalCategories: 0,
    totalHampers: 0,
    totalCustomers: 0,
  };

  const recentOrders = stats?.recentOrders || [];
  const lowStock = stats?.lowStockProducts || [];

  return (
    <>
      <SEO title="Admin Overview Dashboard | Nest Care Connect" />

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Executive Healthcare Dashboard
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Live multi-country store analytics, active inventory alerts, and order velocity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/products"
              className="px-4 py-2 bg-[#237A3B] text-white text-xs font-semibold rounded-xl hover:bg-[#1c6330] transition-colors"
            >
              Manage Catalog
            </Link>
          </div>
        </div>

        {/* Quick Management Shortcuts Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Link
            to="/admin/products"
            className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 hover:border-[#8BCF9B] hover:bg-[#F1FAF3] shadow-2xs transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 group-hover:text-[#237A3B]">Products</div>
              <div className="text-[11px] text-gray-500">Catalog items</div>
            </div>
          </Link>

          <Link
            to="/admin/hampers"
            className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 hover:border-[#8BCF9B] hover:bg-[#F1FAF3] shadow-2xs transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 group-hover:text-[#237A3B]">Hampers</div>
              <div className="text-[11px] text-gray-500">Care hampers</div>
            </div>
          </Link>

          <Link
            to="/admin/boxes"
            className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 hover:border-[#8BCF9B] hover:bg-[#F1FAF3] shadow-2xs transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 group-hover:text-[#237A3B]">Hamper Boxes</div>
              <div className="text-[11px] text-gray-500">Required boxes</div>
            </div>
          </Link>

          <Link
            to="/admin/categories"
            className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 hover:border-[#8BCF9B] hover:bg-[#F1FAF3] shadow-2xs transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 group-hover:text-[#237A3B]">Categories</div>
              <div className="text-[11px] text-gray-500">Shop taxonomy</div>
            </div>
          </Link>

          <Link
            to="/admin/orders"
            className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 hover:border-[#8BCF9B] hover:bg-[#F1FAF3] shadow-2xs transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 group-hover:text-[#237A3B]">Orders</div>
              <div className="text-[11px] text-gray-500">Shipments & status</div>
            </div>
          </Link>
        </div>

        {/* 4 Primary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Gross Sales Revenue</span>
              <div className="w-9 h-9 rounded-xl bg-[#F1FAF3] text-[#237A3B] flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-gray-900">
              ₹{metrics.totalRevenueINR.toLocaleString()}
            </div>
            <span className="text-[11px] text-gray-400">Across IN, AE, & US deliveries</span>
          </div>

          <Link
            to="/admin/orders"
            className="p-6 bg-white rounded-3xl border border-gray-100 hover:border-blue-200 shadow-xs space-y-2 transition-all block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 group-hover:text-blue-700">Total Customer Orders</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-gray-900">{metrics.totalOrders}</div>
            <span className="text-[11px] text-[#237A3B] font-semibold">
              {metrics.paidOrders} Verified Paid Orders →
            </span>
          </Link>

          <Link
            to="/admin/products"
            className="p-6 bg-white rounded-3xl border border-gray-100 hover:border-purple-200 shadow-xs space-y-2 transition-all block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 group-hover:text-purple-700">Active Products & Hampers</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-gray-900">
              {metrics.totalProducts + metrics.totalHampers}
            </div>
            <span className="text-[11px] text-purple-700 font-semibold flex items-center gap-1">
              <span>{metrics.totalProducts} Products • {metrics.totalHampers} Hampers</span>
              <span>→</span>
            </span>
          </Link>

          <Link
            to="/admin/customers"
            className="p-6 bg-white rounded-3xl border border-gray-100 hover:border-amber-200 shadow-xs space-y-2 transition-all block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 group-hover:text-amber-700">Registered Customers</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-gray-900">{metrics.totalCustomers}</div>
            <span className="text-[11px] text-gray-400">Validated user accounts →</span>
          </Link>
        </div>

        {/* Lower Grid: Recent Orders (7 cols) + Low Stock Alert (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Recent Orders */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">Recent Customer Orders</h3>
              <Link
                to="/admin/orders"
                className="text-xs font-bold text-[#237A3B] hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">No orders recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((ord: any) => (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono font-bold text-gray-900">{ord.orderNumber}</div>
                      <div className="text-gray-500 text-[11px]">
                        {ord.guestName || 'Customer'} • {ord.country} ({ord.currency})
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <div className="font-bold text-gray-900">
                        {ord.currency} {ord.total}
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#F1FAF3] text-[#237A3B] text-[10px] font-bold">
                        {ord.orderStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low Stock Alerts */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-base">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Low Inventory Watch</span>
              </div>
            </div>

            {lowStock.length === 0 ? (
              <p className="text-xs text-emerald-700 bg-emerald-50 p-4 rounded-xl text-center font-medium">
                All healthcare items currently have adequate stock levels.
              </p>
            ) : (
              <div className="space-y-3">
                {lowStock.map((prod: any) => (
                  <div
                    key={prod.id}
                    className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-center justify-between text-xs"
                  >
                    <div className="truncate max-w-[180px]">
                      <span className="font-bold text-gray-900 block truncate">{prod.name}</span>
                      <span className="text-[10px] text-gray-500 font-mono">SKU: {prod.sku}</span>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[11px]">
                        {prod.stock} in stock
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
