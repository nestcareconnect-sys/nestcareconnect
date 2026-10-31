import React, { useState, useEffect } from 'react';
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
  Truck,
  Package,
  Copy,
  Check,
  RefreshCw,
  Clock,
  AlertCircle,
  X,
  ArrowRight,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
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
import { isValidTrackingUrl } from '../utils/validation';

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const { wishlist } = useWishlist();
  const { formatPrice, country } = useCountryCurrency();
  const { showToast } = useToast();

  const activeTab = searchParams.get('tab') || 'orders';

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersStatus, setOrdersStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('loading');
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderLoading, setSelectedOrderLoading] = useState(false);
  const [selectedOrderError, setSelectedOrderError] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingOrder, setIsRefreshingOrder] = useState(false);
  const [copiedTrackingId, setCopiedTrackingId] = useState(false);

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

  const handleOpenOrderDetails = async (orderId: string, prefillOrder?: Order) => {
    if (prefillOrder) {
      setSelectedOrder(prefillOrder);
    }
    setSelectedOrderLoading(!prefillOrder);
    setSelectedOrderError(null);

    try {
      const res = await ordersApi.getById(orderId);
      if (res.data?.success && res.data.data) {
        setSelectedOrder(res.data.data);
      } else if (!prefillOrder) {
        setSelectedOrderError('Order details could not be found.');
      }
    } catch (err: any) {
      if (!prefillOrder) {
        setSelectedOrderError(err.response?.data?.message || 'Failed to retrieve order details.');
      }
    } finally {
      setSelectedOrderLoading(false);
    }
  };

  const fetchCustomerOrders = async (showLoading = true) => {
    if (!isAuthenticated) return;
    if (showLoading) setOrdersStatus('loading');
    setOrdersError(null);

    try {
      const res = await ordersApi.getMyOrders();
      if (res.data?.success && Array.isArray(res.data.data)) {
        setOrders(res.data.data);
        setOrdersStatus('success');
      } else {
        setOrdersError('Failed to load your order history. Please try again.');
        setOrdersStatus('error');
      }
    } catch (err: any) {
      setOrdersError(
        err.response?.data?.message || 'Unable to retrieve your order history. Please check your connection.'
      );
      setOrdersStatus('error');
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/account');
      return;
    }

    setIsLoading(true);
    setOrdersStatus('loading');
    setOrdersError(null);

    Promise.allSettled([ordersApi.getMyOrders(), authApi.getAddresses()])
      .then(([ordersResult, addrResult]) => {
        if (ordersResult.status === 'fulfilled' && ordersResult.value.data?.success) {
          const list = ordersResult.value.data.data || [];
          setOrders(list);
          setOrdersStatus('success');

          const qOrderId = searchParams.get('orderId') || searchParams.get('order');
          if (qOrderId) {
            const found = list.find((o: Order) => o.id === qOrderId || o.orderNumber === qOrderId);
            handleOpenOrderDetails(found ? found.id : qOrderId, found);
          }
        } else {
          const errReason = ordersResult.status === 'rejected' ? ordersResult.reason : null;
          setOrdersError(
            errReason?.response?.data?.message || 'Failed to load your order history. Please try again.'
          );
          setOrdersStatus('error');
        }

        if (addrResult.status === 'fulfilled' && addrResult.value.data?.success) {
          setAddresses(addrResult.value.data.data || []);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isAuthenticated, navigate]);

  const handleRefreshSelectedOrder = async (orderId: string) => {
    setIsRefreshingOrder(true);
    try {
      const [orderRes, ordersRes] = await Promise.all([
        ordersApi.getById(orderId),
        ordersApi.getMyOrders(),
      ]);
      if (orderRes.data?.success && orderRes.data.data) {
        setSelectedOrder(orderRes.data.data);
      }
      if (ordersRes.data?.success && ordersRes.data.data) {
        setOrders(ordersRes.data.data);
      }
      showToast('Order details refreshed.', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to refresh order details.', 'error');
    } finally {
      setIsRefreshingOrder(false);
    }
  };

  const handleCopyTracking = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedTrackingId(true);
    showToast('Tracking ID copied to clipboard!', 'success');
    setTimeout(() => setCopiedTrackingId(false), 2000);
  };

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

      <div className="bg-[#E3F5E8] min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <Breadcrumbs items={[{ label: 'My Account' }]} />

          {/* Profile Welcome Header */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B] text-[#237A3B] font-extrabold text-xl flex items-center justify-center">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900">{user?.name}</h1>
                  {user?.emailVerified ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F1FAF3] text-[#237A3B] border border-[#E5E7EB]">
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                      Verified
                    </span>
                  ) : (
                    <Link
                      to={`/verify-email?email=${encodeURIComponent(user?.email || '')}`}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                    >
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      Unverified
                    </Link>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{user?.email} • {user?.phone || 'Phone not set'}</p>
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

          {!user?.emailVerified && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-bold">Email address not verified</p>
                  <p className="text-amber-700 text-[11px]">Verify your email to receive live courier tracking milestones, order confirmations, and priority delivery updates.</p>
                </div>
              </div>
              <Link
                to={`/verify-email?email=${encodeURIComponent(user?.email || '')}`}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs whitespace-nowrap transition-colors"
              >
                Verify Email Now
              </Link>
            </div>
          )}

          {/* Main Account Tabs Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sidebar Navigation (3 cols) */}
            <div className="lg:col-span-3 bg-white rounded-2xl p-3 border border-[#E5E7EB] shadow-xs space-y-1">
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
                        : 'text-gray-700 hover:bg-[#E3F5E8]'
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                    <div>
                      <h3 className="font-bold text-base text-gray-900">Your Healthcare Orders</h3>
                      <p className="text-xs text-gray-500">Track current deliveries and review past care packages.</p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {ordersStatus === 'success' && (
                        <button
                          type="button"
                          onClick={() => fetchCustomerOrders(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#E3F5E8] text-gray-700 border border-[#E5E7EB] rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                          title="Refresh your order history"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Refresh</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 1. Loading State (Skeleton UI) - Prevents premature empty state display */}
                  {ordersStatus === 'loading' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="p-4 bg-[#F1FAF3]/60 rounded-2xl border border-[#8BCF9B]/40 flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-[#8BCF9B] border-t-[#237A3B] rounded-full animate-spin shrink-0" />
                        <span className="text-xs font-medium text-[#1A5B2C]">
                          Fetching your healthcare orders and live fulfillment updates...
                        </span>
                      </div>

                      {[1, 2].map((sKey) => (
                        <div
                          key={sKey}
                          className="p-5 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4 animate-pulse"
                        >
                          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                            <div className="space-y-1.5">
                              <div className="w-32 h-4 bg-gray-200 rounded-md" />
                              <div className="w-24 h-3 bg-gray-100 rounded-md" />
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-20 h-5 bg-gray-200 rounded-full" />
                              <div className="w-16 h-4 bg-gray-200 rounded-md" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="w-3/4 h-3.5 bg-gray-100 rounded-md" />
                            <div className="w-1/2 h-3.5 bg-gray-100 rounded-md" />
                          </div>
                          <div className="p-3 bg-[#E3F5E8] rounded-xl border border-[#E5E7EB] flex items-center justify-between">
                            <div className="w-48 h-3.5 bg-gray-200 rounded-md" />
                            <div className="w-20 h-5 bg-gray-200 rounded-lg" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 2. Error State with Retry Button */}
                  {ordersStatus === 'error' && (
                    <div className="p-8 bg-red-50/70 rounded-3xl border border-red-200 text-center space-y-4 animate-in fade-in duration-200">
                      <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-2xs">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1 max-w-md mx-auto">
                        <h4 className="font-bold text-sm text-red-950">Unable to Load Order History</h4>
                        <p className="text-xs text-red-700 leading-relaxed">
                          {ordersError || 'We could not reach the order service. Please check your connection and try again.'}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => fetchCustomerOrders(true)}
                          className="px-4 py-2 bg-[#237A3B] hover:bg-[#1C6330] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. Empty State (Only shown when API confirms 0 orders) */}
                  {ordersStatus === 'success' && orders.length === 0 && (
                    <div className="bg-white rounded-3xl p-12 border border-[#E5E7EB] text-center space-y-4 shadow-xs animate-in fade-in duration-200">
                      <div className="w-14 h-14 rounded-2xl bg-[#F1FAF3] text-[#237A3B] flex items-center justify-center mx-auto border border-[#8BCF9B]/40">
                        <ShoppingBag className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-gray-900">No orders placed yet</h4>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto">
                          Your past purchases and deliveries will appear here with live timeline updates.
                        </p>
                      </div>
                      <Link
                        to="/shop"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#237A3B] hover:bg-[#1C6330] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        <span>Explore Care Hampers & Products</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}

                  {/* 4. Success State with List of Orders */}
                  {ordersStatus === 'success' && orders.length > 0 && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="p-5 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4 transition-all hover:border-[#8BCF9B]/60"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E7EB] gap-2">
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

                          {/* Tracking info preview if order has tracking / shipped */}
                          {(order.trackingNumber || order.shipment?.trackingNumber || order.orderStatus === 'SHIPPED') ? (
                            <div className="p-3 bg-[#F1FAF3]/60 rounded-xl border border-[#8BCF9B]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-[#237A3B] shrink-0" />
                                <div>
                                  <span className="font-bold text-gray-900">
                                    Dispatched via {order.shipment?.courierName || order.courierName || (order.shippingMethod === 'MANUAL' ? 'Direct Courier' : 'NimbusPost Partner')}
                                  </span>
                                  <span className="text-gray-500 text-[11px] block">
                                    Method: <strong>{order.shippingMethodLabel || (order.shippingMethod === 'MANUAL' ? 'Manual' : 'NimbusPost')}</strong> • Tracking ID: <strong className="font-mono text-[#237A3B]">{order.shipment?.trackingNumber || order.trackingNumber || order.shipment?.awbNumber}</strong>
                                    {(order.dispatchedAt || order.shipment?.dispatchedAt) && (
                                      <span> • Dispatched on {new Date((order.dispatchedAt || order.shipment?.dispatchedAt)!).toLocaleDateString()}</span>
                                    )}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenOrderDetails(order.id, order)}
                                className="px-3 py-1 bg-white border border-[#8BCF9B] text-[#237A3B] rounded-lg font-bold text-[11px] hover:bg-[#F1FAF3] transition-colors self-start sm:self-auto cursor-pointer"
                              >
                                View Tracking
                              </button>
                            </div>
                          ) : order.orderStatus !== 'CANCELLED' ? (
                            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 flex items-center gap-2 text-xs text-amber-800">
                              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Your order is being processed. Tracking details will be available after dispatch.</span>
                            </div>
                          ) : null}

                          <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
                            <span className="text-[11px] text-gray-400">
                              Status: <strong className="text-gray-700">{order.orderStatus}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenOrderDetails(order.id, order)}
                              className="text-xs font-semibold text-[#237A3B] hover:underline cursor-pointer"
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
                      className="p-6 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4"
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
                          className="px-4 py-2 border border-[#E5E7EB] rounded-xl text-xs font-semibold"
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
                        className="p-4 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs space-y-2 relative"
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
                    <div className="bg-white rounded-2xl p-12 border border-[#E5E7EB] text-center space-y-3">
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
                <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-xs space-y-6 max-w-lg">
                  <h3 className="font-bold text-base text-gray-900 pb-3 border-b border-[#E5E7EB]">
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
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:border-[#8BCF9B] outline-none"
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
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:border-[#8BCF9B] outline-none"
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

      {/* Placed Order Details Loading State Modal */}
      {selectedOrderLoading && !selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#E5E7EB] shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 border-4 border-[#8BCF9B] border-t-[#237A3B] rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="font-bold text-base text-gray-900">Loading Placed Order Details...</h3>
              <p className="text-xs text-gray-500">
                Retrieving items, live shipment updates, and fulfillment timeline.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Placed Order Error Modal */}
      {selectedOrderError && !selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#E5E7EB] shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-gray-900">Order Not Available</h3>
              <p className="text-xs text-gray-500">{selectedOrderError}</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const qOrderId = searchParams.get('orderId') || searchParams.get('order');
                  if (qOrderId) handleOpenOrderDetails(qOrderId);
                }}
                className="px-4 py-2 bg-[#237A3B] hover:bg-[#1C6330] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(null);
                  setSelectedOrderError(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Order Details & Tracking Modal */}
      {selectedOrder && (() => {
        const isManual =
          selectedOrder.shippingMethod === 'MANUAL' ||
          selectedOrder.isManualShipment === true ||
          selectedOrder.shipment?.shippingMethod === 'MANUAL' ||
          selectedOrder.shipment?.provider === 'MANUAL';

        const awb =
          selectedOrder.shipment?.trackingNumber ||
          selectedOrder.shipment?.awbNumber ||
          selectedOrder.trackingNumber ||
          selectedOrder.manualShipment?.trackingNumber;

        const courier =
          selectedOrder.shipment?.courierName ||
          selectedOrder.courierName ||
          selectedOrder.manualShipment?.courierName ||
          (isManual ? 'Direct Courier Partner' : 'NimbusPost Partner');

        const trackingUrl =
          selectedOrder.shipment?.trackingUrl ||
          selectedOrder.trackingUrl ||
          selectedOrder.manualShipment?.trackingUrl;

        const hasValidUrl = isValidTrackingUrl(trackingUrl);

        const dispatchDate =
          selectedOrder.shipment?.dispatchedAt ||
          selectedOrder.dispatchedAt ||
          selectedOrder.manualShipment?.dispatchedAt ||
          selectedOrder.manualShipment?.dispatchDate;

        const formattedDispatchDate = dispatchDate
          ? new Date(dispatchDate).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : null;

        const estimatedDelivery =
          selectedOrder.shipment?.estimatedDelivery ||
          selectedOrder.estimatedDelivery ||
          selectedOrder.manualShipment?.estimatedDelivery;

        const shippingNotes =
          selectedOrder.shipment?.shippingNotes ||
          selectedOrder.manualShipment?.shippingNotes ||
          selectedOrder.notes;

        const isShipped =
          selectedOrder.orderStatus === 'SHIPPED' ||
          selectedOrder.orderStatus === 'DELIVERED' ||
          Boolean(awb);

        const shippingAddr = (selectedOrder.shippingAddress || selectedOrder.recipient) as any || {};

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E5E7EB] overflow-hidden my-6 animate-in fade-in zoom-in duration-200">
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-[#1C6330] via-[#237A3B] to-[#237A3B] text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase bg-white/20 text-white px-2.5 py-0.5 rounded-full font-bold">
                      Order #{selectedOrder.orderNumber}
                    </span>
                    <span className="text-[11px] text-white/80">
                      Placed {new Date(selectedOrder.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-base sm:text-lg mt-1 text-white">Order Details & Tracking</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRefreshSelectedOrder(selectedOrder.id)}
                    disabled={isRefreshingOrder}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Refresh order details"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingOrder ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
                {/* 1. REQUIRED SECTION: Shipment & Tracking */}
                <div className="p-5 rounded-2xl border-2 border-[#8BCF9B]/60 bg-gradient-to-br from-[#F1FAF3] via-white to-[#E3F5E8]/30 space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#8BCF9B]/30">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#237A3B] text-white flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">Shipment & Tracking</h4>
                        <p className="text-[11px] text-gray-500">Live courier fulfillment information</p>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white border border-[#8BCF9B] text-[#237A3B] inline-block self-start sm:self-auto">
                      {selectedOrder.orderStatus}
                    </span>
                  </div>

                  {isShipped && awb ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="bg-white p-3 rounded-xl border border-[#E5E7EB]">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">Shipping Method</span>
                          <span className="font-bold text-gray-900 text-xs">
                            {selectedOrder.shippingMethodLabel || (
                              selectedOrder.shippingMethod === 'MANUAL' || isManual ? 'Manual' : 'NimbusPost'
                            )}
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-[#E5E7EB]">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">Courier</span>
                          <span className="font-bold text-gray-900 text-xs">{courier}</span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-[#E5E7EB]">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">Shipment Status</span>
                          <span className="font-bold text-[#237A3B] text-xs uppercase">
                            {selectedOrder.shipment?.status || selectedOrder.orderStatus}
                          </span>
                        </div>

                        {formattedDispatchDate && (
                          <div className="bg-white p-3 rounded-xl border border-[#E5E7EB]">
                            <span className="text-[10px] text-gray-400 font-bold uppercase block">Dispatch Date</span>
                            <span className="font-bold text-gray-800 text-xs">{formattedDispatchDate}</span>
                          </div>
                        )}

                        <div className="bg-white p-3 rounded-xl border border-[#E5E7EB] sm:col-span-2">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">Tracking ID / AWB</span>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="font-mono font-bold text-xs text-[#237A3B] bg-[#F1FAF3] px-2.5 py-1 rounded-lg border border-[#8BCF9B]/40">
                              {awb}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyTracking(awb)}
                              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                            >
                              {copiedTrackingId ? <Check className="w-3 h-3 text-[#237A3B]" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedTrackingId ? 'Copied' : 'Copy ID'}</span>
                            </button>
                          </div>
                        </div>

                        {estimatedDelivery && (
                          <div className="bg-white p-3 rounded-xl border border-[#E5E7EB]">
                            <span className="text-[10px] text-gray-400 font-bold uppercase block">Estimated Delivery</span>
                            <span className="font-bold text-gray-800 text-xs">{estimatedDelivery}</span>
                          </div>
                        )}

                        {shippingNotes && (
                          <div className="bg-white p-3 rounded-xl border border-[#E5E7EB] sm:col-span-2">
                            <span className="text-[10px] text-gray-400 font-bold uppercase block">Shipping Notes</span>
                            <span className="text-gray-700 italic text-xs">{shippingNotes}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons: External Carrier Tracking & Internal Portal */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {hasValidUrl && (
                          <a
                            href={trackingUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#237A3B] hover:bg-[#1C6330] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                          >
                            <span>Track Shipment</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(null);
                            navigate(`/order-tracking?order=${selectedOrder.orderNumber}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-300 hover:bg-[#E3F5E8] text-gray-800 font-bold text-xs rounded-xl shadow-2xs transition-colors"
                        >
                          <span>Live Timeline Page</span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-white rounded-xl border border-[#E5E7EB] flex items-start gap-3">
                      <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold text-gray-900 block text-xs">Order In Progress</span>
                        <p className="text-gray-700 text-xs font-medium">
                          Your order is being processed. Tracking details will be available after dispatch.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Items Breakdown */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500">
                    Ordered Healthcare Items ({selectedOrder.items?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[#E3F5E8] rounded-xl border border-[#E5E7EB] flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-gray-900 block">{item.name}</span>
                          <span className="text-[11px] text-gray-500">
                            Quantity: {item.quantity} × {formatPrice(item.unitPrice)}
                          </span>
                        </div>
                        <span className="font-bold text-[#237A3B]">{formatPrice(item.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Delivery Destination & Payment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#E3F5E8] rounded-xl border border-[#E5E7EB] space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#237A3B]" /> Shipping Destination
                    </span>
                    <p className="font-bold text-gray-900">{shippingAddr.name || 'Recipient'}</p>
                    <p className="text-gray-600">{shippingAddr.phone}</p>
                    <p className="text-gray-600">{shippingAddr.addressLine1}</p>
                    {shippingAddr.addressLine2 && <p className="text-gray-600">{shippingAddr.addressLine2}</p>}
                    <p className="text-gray-600">
                      {shippingAddr.city}, {shippingAddr.state || shippingAddr.emirate} - {shippingAddr.postalCode}
                    </p>
                    <p className="font-semibold text-[#237A3B]">{selectedOrder.country}</p>
                  </div>

                  <div className="p-4 bg-[#E3F5E8] rounded-xl border border-[#E5E7EB] space-y-1.5">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Payment & Total</span>
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-[#237A3B]">
                        <span>Discount</span>
                        <span>-{formatPrice(selectedOrder.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>Shipping Fee</span>
                      <span>{selectedOrder.shippingFee === 0 ? 'FREE' : formatPrice(selectedOrder.shippingFee)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-[#E5E7EB]">
                      <span>Total Paid</span>
                      <span className="text-[#237A3B]">{formatPrice(selectedOrder.total)}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 pt-1">
                      Provider: {selectedOrder.paymentProvider} • Status: {selectedOrder.paymentStatus}
                    </p>
                  </div>
                </div>

                {/* 4. Order Activity History (Timeline) */}
                {selectedOrder.timeline && selectedOrder.timeline.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500">
                      Activity History
                    </h4>
                    <div className="space-y-2">
                      {selectedOrder.timeline.map((evt) => (
                        <div
                          key={evt.id}
                          className="p-3 bg-[#E3F5E8] rounded-xl border border-[#E5E7EB] flex items-start gap-2.5"
                        >
                          <div className="w-2 h-2 rounded-full bg-[#237A3B] mt-1.5 shrink-0" />
                          <div className="flex-1">
                            <span className="font-bold text-gray-900 block">{evt.title}</span>
                            {evt.description && <p className="text-gray-600 text-[11px] mt-0.5">{evt.description}</p>}
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {new Date(evt.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-[#E3F5E8] border-t border-[#E5E7EB] flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};
