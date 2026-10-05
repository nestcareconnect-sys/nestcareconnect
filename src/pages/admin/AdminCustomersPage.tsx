import React, { useState, useEffect } from 'react';
import { Users, Search, ShoppingBag, Mail, Phone, Calendar } from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { adminApi } from '../../services/api';

export const AdminCustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    adminApi
      .getCustomers({ search: searchQuery })
      .then((res) => {
        if (res.data?.success && res.data.data?.customers) {
          setCustomers(res.data.data.customers);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [searchQuery]);

  return (
    <>
      <SEO title="Customers | Admin" />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Registered Customers
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            View customer contact records and cumulative order counts.
          </p>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-400 ml-1" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers by name, email, or phone..."
            className="flex-1 text-xs bg-transparent border-none outline-none text-gray-800"
          />
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
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No customers found.
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
