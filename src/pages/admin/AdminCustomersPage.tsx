import React, { useState } from 'react';
import { Users, Search, ShoppingBag, Mail, Phone, Calendar, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { adminApi } from '../../services/api';
import { useQuery } from '@tanstack/react-query';

export const AdminCustomersPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: customers = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-customers', searchQuery],
    queryFn: async () => {
      const res = await adminApi.getCustomers({ search: searchQuery.trim() });
      if (res.data?.success && res.data.data?.customers) {
        return res.data.data.customers as any[];
      }
      throw new Error((res.data as any)?.message || 'Failed to retrieve customer accounts.');
    },
    staleTime: 30000,
  });

  return (
    <>
      <SEO title="Customers | Admin" />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Registered Customers
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              View customer contact records and cumulative order counts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh customer directory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isFetching ? 'animate-spin text-[#237A3B]' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Search className="w-4 h-4 text-gray-400 ml-1" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers by name, email, or phone..."
              className="flex-1 text-xs bg-transparent border-none outline-none text-gray-800"
            />
          </div>
          {isFetching && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#237A3B] font-medium animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Searching...</span>
            </div>
          )}
          {!isFetching && !isLoading && !isError && customers.length > 0 && (
            <span className="text-xs text-gray-400">{customers.length} customers</span>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-100">
              <tr>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Orders Placed</th>
                <th className="p-4">Member Since</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {isLoading || (isFetching && customers.length === 0) ? (
                <tr>
                  <td colSpan={6} className="py-20 px-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#237A3B] flex items-center justify-center shadow-2xs">
                        <Loader2 className="w-6 h-6 animate-spin text-[#237A3B]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Loading customer records...</p>
                        <p className="text-xs text-gray-500 mt-0.5">Fetching registered customers and order histories from database</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="py-16 px-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-2xs">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Unable to load customer directory</p>
                        <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
                          {(error as any)?.response?.data?.message ||
                            (error as any)?.message ||
                            'A network or server error occurred while retrieving customer records.'}
                        </p>
                      </div>
                      <button
                        onClick={() => refetch()}
                        className="mt-1 px-4 py-2 bg-[#237A3B] hover:bg-[#1c6330] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 px-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center shadow-2xs">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">No customers found.</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {searchQuery
                            ? `No customer accounts matching "${searchQuery}".`
                            : 'No customers have registered accounts yet.'}
                        </p>
                      </div>
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="mt-1 px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-4 font-bold text-gray-900">{c.name}</td>
                    <td className="p-4 text-gray-600">{c.email}</td>
                    <td className="p-4 text-gray-600 font-mono">{c.phone || '—'}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F1FAF3] text-[#237A3B] font-bold text-xs">
                        {c._count?.orders || 0} orders
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
