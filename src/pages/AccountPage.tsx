import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  User,
  ShoppingBag,
  MapPin,
  Heart,
  Lock,
  LogOut,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { ProductCard } from '../components/product/ProductCard';
import { CountryAddressForm } from '../components/checkout/CountryAddressForm';
import { Order, Address } from '../types';
import { authApi, ordersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useCountryCurrency } from '../context/CountryCurrencyContext';
import { useToast } from '../context/ToastContext';

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const { wishlist } = useWishlist();
  const { formatPrice, country } = useCountryCurrency();
  const { showToast } = useToast();

  const activeTab = searchParams.get('tab') || 'orders';

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Address add form
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState<Partial<Address>>({
    name: user?.name || '',
    phone: user?.phone || '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    emirate: '',
    postalCode: '',
    country,
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/account');
      return;
    }

    setIsLoading(true);
    Promise.all([ordersApi.getMyOrders(), authApi.getAddresses()])
      .then(([ordersRes, addrRes]) => {
        if (ordersRes.data?.success) setOrders(ordersRes.data.data);
        if (addrRes.data?.success) setAddresses(addrRes.data.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, navigate]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authApi.createAddress(newAddress);
      if (res.data?.success) {
        showToast('Address added to your account.', 'success');
        setAddresses((prev) => [res.data.data, ...prev]);
        setIsAddingAddress(false);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save address.', 'error');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await authApi.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      showToast('Address removed.', 'info');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to remove address.', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    setIsChangingPassword(true);
    try {
      const res = await authApi.changePassword({ currentPassword, newPassword });
      if (res.data?.success) {
        showToast('Password updated successfully.', 'success');
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Could not change password.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <SEO title="My Account | Nest Care Connect" description="Manage orders, addresses, and account security." />

      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <Breadcrumbs items={[{ label: 'My Account' }]} />

          {/* Profile Welcome Header */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B] text-[#237A3B] font-extrabold text-xl flex items-center justify-center">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{user?.name}</h1>
                <p className="text-xs text-gray-500">{user?.email} • {user?.phone || 'Phone not set'}</p>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors border border-red-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Main Account Tabs Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sidebar Navigation (3 cols) */}
            <div className="lg:col-span-3 bg-white rounded-2xl p-3 border border-gray-100 shadow-xs space-y-1">
              {[
                { key: 'orders', label: 'Order History', icon: ShoppingBag, count: orders.length },
                { key: 'addresses', label: 'Saved Addresses', icon: MapPin, count: addresses.length },
                { key: 'wishlist', label: 'Saved Items', icon: Heart, count: wishlist.length },
                { key: 'security', label: 'Security & Password', icon: Lock },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setSearchParams({ tab: tab.key })}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#237A3B] text-white shadow-xs'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </div>
                    {tab.count !== undefined && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content Area (9 cols) */}
            <div className="lg:col-span-9 min-w-0">
              {/* TAB 1: Orders */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-gray-900">Your Healthcare Orders</h3>
                  </div>

                  {orders.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center space-y-3">
                      <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto" />
                      <h4 className="font-bold text-sm text-gray-800">No orders placed yet</h4>
                      <p className="text-xs text-gray-500 max-w-xs mx-auto">
                        Your past purchases and deliveries will appear here with live timeline updates.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="p-5 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                            <div>
                              <span className="font-mono text-xs font-bold text-gray-900 block">
                                {order.orderNumber}
                              </span>
                              <span className="text-[11px] text-gray-400">
                                Placed on {new Date(order.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="px-2.5 py-0.5 rounded-full bg-[#F1FAF3] text-[#237A3B] text-xs font-bold">
                                {order.orderStatus}
                              </span>
                              <span className="font-bold text-xs text-gray-900">
                                {formatPrice(order.total)}
                              </span>
                            </div>
                          </div>

                          {/* Items in order */}
                          <div className="space-y-2">
                            {order.items?.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs text-gray-700"
                              >
                                <span className="font-medium">
                                  {item.name} × {item.quantity}
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {formatPrice(item.totalPrice)}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-gray-100 flex justify-end">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="text-xs font-semibold text-[#237A3B] hover:underline"
                            >
                              View Full Details & Timeline →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Saved Addresses */}
              {activeTab === 'addresses' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-gray-900">Delivery Addresses</h3>
                    {!isAddingAddress && (
                      <button
                        onClick={() => setIsAddingAddress(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#237A3B] text-white rounded-xl text-xs font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New Address</span>
                      </button>
                    )}
                  </div>

                  {isAddingAddress && (
                    <form
                      onSubmit={handleSaveAddress}
                      className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4"
                    >
                      <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500">
                        New Delivery Address
                      </h4>
                      <CountryAddressForm
                        country={country}
                        address={newAddress}
                        onChange={(f, v) => setNewAddress((prev) => ({ ...prev, [f]: v }))}
                      />
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingAddress(false)}
                          className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-[#237A3B] text-white rounded-xl text-xs font-bold"
                        >
                          Save Address
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-2 relative"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-xs text-gray-900">{addr.name}</span>
                          <button
                            onClick={() => addr.id && handleDeleteAddress(addr.id)}
                            className="text-gray-400 hover:text-red-500 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs text-gray-600 space-y-0.5">
                          <p>{addr.phone}</p>
                          <p>{addr.addressLine1}</p>
                          {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                          <p>
                            {addr.city}, {addr.state || addr.emirate} - {addr.postalCode}
                          </p>
                          <p className="font-semibold text-[#237A3B]">{addr.country}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: Wishlist */}
              {activeTab === 'wishlist' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-base text-gray-900">Saved Healthcare Products</h3>
                  {wishlist.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center space-y-3">
                      <Heart className="w-12 h-12 text-gray-300 mx-auto" />
                      <h4 className="font-bold text-sm text-gray-800">No saved items</h4>
                      <p className="text-xs text-gray-500">
                        Click the heart icon on any product or hamper to save it for later.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {wishlist.map((prod) => (
                        <ProductCard key={prod.id} product={prod} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Security */}
              {activeTab === 'security' && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs space-y-6 max-w-lg">
                  <h3 className="font-bold text-base text-gray-900 pb-3 border-b border-gray-100">
                    Security & Password
                  </h3>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isChangingPassword || !currentPassword || !newPassword}
                      className="px-5 py-2.5 bg-[#237A3B] text-white rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      Update Password
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
