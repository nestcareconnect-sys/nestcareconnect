import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Edit2,
  CheckCircle2,
  Truck,
  ExternalLink,
  Filter,
  Video,
  QrCode,
  Printer,
  Eye,
  UserCheck,
  Heart,
  Loader2,
  AlertCircle,
  Package,
  RefreshCw,
  Download,
  Image as ImageIcon,
  Sparkles,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { Order, OrderStatus, PaymentStatus, VideoStatus, NimbusTrackingResult, ShippingInfo } from '../../types';
import { ordersApi, shippingApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useCountryCurrency } from '../../context/CountryCurrencyContext';

export const AdminOrdersPage: React.FC = () => {
  const { showToast } = useToast();
  const { formatPrice } = useCountryCurrency();

  const [orders, setOrders] = useState<Order[]>([]);
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [videoFilter, setVideoFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Status edit modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newOrderStatus, setNewOrderStatus] = useState<OrderStatus>('PENDING');
  const [newPaymentStatus, setNewPaymentStatus] = useState<PaymentStatus>('PENDING');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // NimbusPost Shipment Modal
  const [nimbusOrder, setNimbusOrder] = useState<Order | null>(null);
  const [selectedCourierName, setSelectedCourierName] = useState('Delhivery Surface Express');
  const [isBookingShipment, setIsBookingShipment] = useState(false);

  // Test Shipment Success Dialog State
  const [createdTestShipment, setCreatedTestShipment] = useState<{
    orderNumber: string;
    shipmentId: string;
    awbNumber: string;
    courierName: string;
    labelUrl?: string;
  } | null>(null);

  // NimbusPost Tracking Modal
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [trackingData, setTrackingData] = useState<NimbusTrackingResult | null>(null);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);

  // Video & QR Modal
  const [videoOrder, setVideoOrder] = useState<Order | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoStatusInput, setVideoStatusInput] = useState<VideoStatus>('VIDEO_READY');
  const [qrCodeData, setQrCodeData] = useState<{ targetUrl: string; qrDataUrl: string } | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [previewAdminPhotoUrl, setPreviewAdminPhotoUrl] = useState<string | null>(null);

  // Retrying shipment state
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);

  const loadOrders = () => {
    setIsLoading(true);
    ordersApi
      .getAdminOrders({
        search: searchQuery,
        status: statusFilter || undefined,
        videoStatus: videoFilter || undefined,
      })
      .then((res) => {
        if (res.data?.success && res.data.data?.orders) {
          setOrders(res.data.data.orders);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadOrders();
    // Load shipping info
    shippingApi
      .getInfo()
      .then((res) => {
        if (res.data?.success && res.data.data) {
          setShippingInfo(res.data.data);
        }
      })
      .catch(() => {});
  }, [statusFilter, videoFilter]);

  const handleOpenStatusModal = (ord: Order) => {
    setSelectedOrder(ord);
    setNewOrderStatus(ord.orderStatus);
    setNewPaymentStatus(ord.paymentStatus);
    setTrackingNumber(ord.trackingNumber || ord.shipment?.awbNumber || '');
    setStatusNote('');
  };

  const handleOpenNimbusShipModal = (ord: Order) => {
    setNimbusOrder(ord);
    setSelectedCourierName(shippingInfo?.defaultCourier || 'Delhivery Surface Express');
  };

  const handleBookNimbusShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nimbusOrder) return;

    setIsBookingShipment(true);
    try {
      const res = await shippingApi.createNimbusShipment({
        orderId: nimbusOrder.id,
        courierName: selectedCourierName,
      });

      if (res.data?.success && res.data.data) {
        const shipment = res.data.data;
        showToast(
          `✓ Test shipment created for #${nimbusOrder.orderNumber}! AWB: ${shipment.awbNumber}`,
          'success'
        );

        setCreatedTestShipment({
          orderNumber: nimbusOrder.orderNumber,
          shipmentId: shipment.id || shipment.providerOrderId || 'NIMBUS-TEST-ID',
          awbNumber: shipment.awbNumber,
          courierName: shipment.courierName,
          labelUrl: shipment.labelUrl,
        });

        setNimbusOrder(null);
        loadOrders();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to book NimbusPost shipment.', 'error');
    } finally {
      setIsBookingShipment(false);
    }
  };

  const handleRetryShipment = async (ord: Order) => {
    setRetryingOrderId(ord.id);
    try {
      const res = await shippingApi.retryShipment({
        orderId: ord.id,
        courierName: ord.shipment?.courierName || 'Delhivery Surface Express',
      });

      if (res.data?.success && res.data.data) {
        showToast(`Shipment retried successfully! AWB: ${res.data.data.awbNumber}`, 'success');
        loadOrders();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to retry shipment.', 'error');
    } finally {
      setRetryingOrderId(null);
    }
  };

  const handleOpenTrackingModal = async (ord: Order) => {
    setTrackingOrder(ord);
    setTrackingData(null);
    setIsLoadingTracking(true);

    const awb = ord.shipment?.awbNumber || ord.trackingNumber || ord.orderNumber;
    try {
      const res = await shippingApi.trackNimbusShipment(awb);
      if (res.data?.success && res.data.data) {
        setTrackingData(res.data.data);
      }
    } catch {
      // fallback
    } finally {
      setIsLoadingTracking(false);
    }
  };

  const handleRefreshTracking = async () => {
    if (!trackingOrder) return;
    setIsLoadingTracking(true);
    const awb = trackingOrder.shipment?.awbNumber || trackingOrder.trackingNumber || trackingOrder.orderNumber;
    try {
      const res = await shippingApi.trackNimbusShipment(awb);
      if (res.data?.success && res.data.data) {
        setTrackingData(res.data.data);
        showToast('Tracking status refreshed.', 'success');
      }
    } catch {
      showToast('Failed to refresh tracking.', 'error');
    } finally {
      setIsLoadingTracking(false);
    }
  };

  const handleOpenVideoModal = async (ord: Order) => {
    setVideoOrder(ord);
    setVideoUrlInput(ord.videoUrl || '');
    setVideoStatusInput(ord.videoStatus || 'VIDEO_REQUIRED');
    setQrCodeData(null);

    setIsGeneratingQR(true);
    try {
      const res = await ordersApi.generateQRCode(ord.id);
      if (res.data?.success && res.data.data) {
        setQrCodeData(res.data.data);
      }
    } catch {
      // Fallback
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoOrder) return;

    setIsSavingVideo(true);
    try {
      await ordersApi.updateVideo(videoOrder.id, {
        videoUrl: videoUrlInput.trim(),
        videoStatus: videoStatusInput,
      });

      showToast(`Personalized video link and status saved for order ${videoOrder.orderNumber}.`, 'success');
      loadOrders();
      setVideoOrder((prev) =>
        prev ? { ...prev, videoUrl: videoUrlInput.trim(), videoStatus: videoStatusInput } : null
      );
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save video details.', 'error');
    } finally {
      setIsSavingVideo(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setIsUpdating(true);
    try {
      await ordersApi.updateStatus(selectedOrder.id, {
        orderStatus: newOrderStatus,
        paymentStatus: newPaymentStatus,
        trackingNumber: trackingNumber.trim() || undefined,
        note: statusNote.trim() || undefined,
      });

      showToast(`Order ${selectedOrder.orderNumber} status updated.`, 'success');
      setSelectedOrder(null);
      loadOrders();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update order.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrintShippingLabel = (labelUrl?: string) => {
    if (labelUrl) {
      window.open(labelUrl, '_blank');
    } else {
      window.print();
    }
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.guestName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.buyer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.recipient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.guestEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.shipment?.awbNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <SEO title="Order Fulfillment & NimbusPost Logistics Hub | Admin" />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Order Fulfillment & NimbusPost Shipping Hub
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Manage demo payments, book & track NimbusPost courier shipments (Blue Dart, Delhivery, Shadowfax), and fulfill family gift hampers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* NimbusPost Test Mode Indicator */}
            <div className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold">
              <Truck className="w-4 h-4 text-[#237A3B]" />
              <span>NIMBUSPOST TEST MODE</span>
            </div>

            {(import.meta.env.VITE_PAYMENT_PROVIDER || 'demo').toLowerCase() === 'demo' && (
              <div className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-bold">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>DEMO PAYMENT MODE</span>
              </div>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full md:w-80 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order #, AWB, buyer, recipient..."
              className="w-full text-xs bg-transparent border-none outline-none text-gray-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-medium">Order Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:border-[#8BCF9B] outline-none"
              >
                <option value="">All Orders</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PROCESSING">Processing</option>
                <option value="PACKED">Packed</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-medium">Video QR:</span>
              <select
                value={videoFilter}
                onChange={(e) => setVideoFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:border-[#8BCF9B] outline-none"
              >
                <option value="">All Video States</option>
                <option value="VIDEO_REQUIRED">Video Required</option>
                <option value="VIDEO_PROCESSING">Video Processing</option>
                <option value="VIDEO_READY">Video Ready</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-4">Order Number</th>
                  <th className="p-4">Buyer (Sender)</th>
                  <th className="p-4">Recipient (Delivery)</th>
                  <th className="p-4">Payment & Total</th>
                  <th className="p-4">NimbusPost Logistics</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      No orders found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const awb = ord.shipment?.awbNumber || ord.trackingNumber;
                    const courier = ord.shipment?.courierName || 'Nimbus Courier';
                    const isFailedShipment =
                      ord.shipment?.shipmentStatus === 'SHIPMENT_CREATION_FAILED' ||
                      ord.shipment?.shipmentStatus === 'FAILED' ||
                      (ord.shipment && !awb && ord.shipment.errorMessage);

                    return (
                      <tr key={ord.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="p-4 font-mono font-bold text-gray-900">
                          {ord.orderNumber}
                          <span className="block text-[10px] text-gray-400 font-normal">
                            {new Date(ord.createdAt).toLocaleDateString()}
                          </span>
                        </td>

                        {/* Buyer */}
                        <td className="p-4">
                          <div>
                            <span className="font-bold text-gray-900 block">
                              {ord.buyer?.name || ord.guestName || 'Customer'}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              {ord.buyer?.country || ord.buyerCountry || 'US'} • {ord.buyer?.phone || ord.guestPhone || ''}
                            </span>
                          </div>
                        </td>

                        {/* Recipient */}
                        <td className="p-4">
                          <div>
                            <span className="font-bold text-emerald-800 flex items-center gap-1">
                              <Heart className="w-3 h-3 text-red-500 fill-red-500 shrink-0" />
                              {ord.recipient?.name || ord.shippingAddress?.name || 'Loved One'}
                            </span>
                            <span className="text-[11px] text-gray-500 block truncate max-w-[160px]">
                              {ord.recipient?.city || ord.shippingAddress?.city || 'India'} (PIN: {ord.recipient?.postalCode || ord.shippingAddress?.postalCode || '560001'})
                            </span>
                          </div>
                        </td>

                        {/* Payment & Total */}
                        <td className="p-4">
                          <div className="font-bold text-gray-900">
                            {ord.currency} {ord.total.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                                ord.paymentStatus === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : ord.paymentStatus === 'FAILED'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {ord.paymentProvider === 'DEMO' || ord.transactionId?.startsWith('demo_')
                                ? (ord.paymentStatus === 'PAID' ? '✓ DEMO Paid' : `DEMO ${ord.paymentStatus}`)
                                : (ord.paymentStatus === 'PAID' ? '✓ Razorpay Paid' : ord.paymentStatus)}
                            </span>
                          </div>
                          {(ord.transactionId || ord.paymentId) && (
                            <span className="font-mono text-[9px] text-gray-400 block truncate max-w-[130px] mt-0.5" title={ord.transactionId || ord.paymentId || undefined}>
                              {ord.transactionId || ord.paymentId}
                            </span>
                          )}
                        </td>

                        {/* NimbusPost Logistics Column */}
                        <td className="p-4">
                          {awb ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-gray-900">
                                <Truck className="w-3.5 h-3.5 text-[#237A3B]" />
                                <span>{courier}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded-md inline-block font-semibold">
                                  {awb}
                                </span>
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-50 text-[#237A3B] rounded border border-[#8BCF9B]/40">
                                  TEST
                                </span>
                              </div>
                            </div>
                          ) : isFailedShipment ? (
                            <div className="space-y-1">
                              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold block w-fit">
                                Shipment Failed
                              </span>
                              {ord.shipment?.errorMessage && (
                                <span className="text-[10px] text-red-500 block truncate max-w-[160px]" title={ord.shipment.errorMessage}>
                                  {ord.shipment.errorMessage}
                                </span>
                              )}
                              <button
                                onClick={() => handleRetryShipment(ord)}
                                disabled={retryingOrderId === ord.id}
                                className="mt-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                              >
                                {retryingOrderId === ord.id ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" /> Retrying...
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw className="w-3 h-3" /> Retry Shipment
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <div>
                              <span className="text-gray-400 text-[11px] block">Unbooked</span>
                              {ord.paymentStatus === 'PAID' && (
                                <button
                                  onClick={() => handleOpenNimbusShipModal(ord)}
                                  className="mt-1 px-2.5 py-1 bg-[#237A3B] text-white text-[10px] font-bold rounded-lg hover:bg-[#1c6330] flex items-center gap-1 shadow-xs transition-colors"
                                >
                                  <Truck className="w-3 h-3" /> Create Test Shipment
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Order Status */}
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full bg-[#F1FAF3] text-[#237A3B] text-[10px] font-bold border border-[#8BCF9B]/40">
                            {ord.orderStatus}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {awb && (
                              <>
                                <button
                                  onClick={() => handleOpenTrackingModal(ord)}
                                  className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1"
                                  title="Live NimbusPost Tracking"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Track</span>
                                </button>

                                <button
                                  onClick={() => handlePrintShippingLabel(ord.shipment?.labelUrl || undefined)}
                                  className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1"
                                  title="Print Shipping Label"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Label</span>
                                </button>
                              </>
                            )}

                            {ord.videoSecureToken && (
                              <button
                                onClick={() => handleOpenVideoModal(ord)}
                                className="px-2 py-1.5 bg-[#F1FAF3] hover:bg-[#8BCF9B]/30 text-[#237A3B] rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1"
                                title="Manage Video & QR Card"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">QR Video</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenStatusModal(ord)}
                              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-[11px] transition-colors"
                            >
                              Manage
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Test Shipment Success Dialog Modal */}
      {createdTestShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 bg-gradient-to-r from-[#237A3B] to-[#1c6330] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#8BCF9B]" />
                <h3 className="font-bold text-sm">✓ Test Shipment Created</h3>
              </div>
              <button onClick={() => setCreatedTestShipment(null)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#237A3B] tracking-wider block">
                  NimbusPost Test Mode Confirmation
                </span>
                <p className="font-medium text-[11px]">
                  Shipment generated under <strong>NIMBUSPOST TEST MODE</strong>. No live courier pickup will be dispatched.
                </p>
              </div>

              <div className="space-y-2.5 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500 font-medium">Order Number:</span>
                  <span className="font-bold text-gray-900 font-mono">{createdTestShipment.orderNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500 font-medium">Shipment ID:</span>
                  <span className="font-bold text-gray-900 font-mono">{createdTestShipment.shipmentId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500 font-medium">AWB Number:</span>
                  <span className="font-bold text-[#237A3B] font-mono">{createdTestShipment.awbNumber}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 font-medium">Courier Partner:</span>
                  <span className="font-bold text-gray-900">{createdTestShipment.courierName}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                {createdTestShipment.labelUrl && (
                  <button
                    onClick={() => handlePrintShippingLabel(createdTestShipment.labelUrl)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>View / Print Label</span>
                  </button>
                )}
                <button
                  onClick={() => setCreatedTestShipment(null)}
                  className="px-5 py-2 bg-[#237A3B] text-white font-bold rounded-xl"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NimbusPost Shipment Creation Modal */}
      {nimbusOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 bg-[#237A3B] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#8BCF9B] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> NimbusPost Logistics Dispatch (Test Mode)
                </span>
                <h3 className="font-bold text-sm">Ship Order #{nimbusOrder.orderNumber}</h3>
              </div>
              <button onClick={() => setNimbusOrder(null)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleBookNimbusShipment} className="p-6 space-y-4 text-xs">
              {/* Test mode prompt */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider block text-amber-800">
                  ⚠️ Test Mode Dispatch
                </span>
                <p className="text-[11px] leading-relaxed">
                  This will create a <strong>TEST</strong> shipment in NimbusPost. No production shipment will be created.
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Delivery Destination</span>
                <p className="font-bold text-gray-900">
                  {nimbusOrder.recipient?.name || nimbusOrder.shippingAddress?.name}
                </p>
                <p className="text-gray-500 text-[11px]">
                  {nimbusOrder.recipient?.addressLine1 || nimbusOrder.shippingAddress?.addressLine1},{' '}
                  {nimbusOrder.recipient?.city || nimbusOrder.shippingAddress?.city} - PIN:{' '}
                  {nimbusOrder.recipient?.postalCode || nimbusOrder.shippingAddress?.postalCode}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Select NimbusPost Courier Partner</label>
                <select
                  value={selectedCourierName}
                  onChange={(e) => setSelectedCourierName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800"
                >
                  <option value="Delhivery Surface Express">Delhivery Surface Express (Fast & Economical - ~2 days)</option>
                  <option value="Blue Dart Express Air">Blue Dart Express Air (Priority Air Care - ~1-2 days)</option>
                  <option value="Shadowfax Priority Care">Shadowfax Priority Care (~2 days)</option>
                  <option value="DTDC Healthcare Express">DTDC Healthcare Express (~2-3 days)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setNimbusOrder(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBookingShipment}
                  className="px-5 py-2 bg-[#237A3B] text-white font-bold rounded-xl shadow-md flex items-center gap-1.5"
                >
                  {isBookingShipment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Test Shipment...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4" />
                      <span>Create Test Shipment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NimbusPost Live Tracking Modal */}
      {trackingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 bg-[#237A3B] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#8BCF9B] font-bold">
                  NimbusPost Tracking & Manifest
                </span>
                <h3 className="font-bold text-sm">Order #{trackingOrder.orderNumber}</h3>
              </div>
              <button onClick={() => setTrackingOrder(null)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {isLoadingTracking ? (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#237A3B]" />
                  <p>Fetching real-time NimbusPost tracking updates...</p>
                </div>
              ) : trackingData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Courier Partner</span>
                      <span className="font-bold text-gray-900">{trackingData.courierName}</span>
                      <span className="font-mono text-[10px] text-gray-500 block">AWB: {trackingData.awbNumber}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Status</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#F1FAF3] text-[#237A3B] font-bold text-[10px]">
                        {trackingData.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-gray-800 text-xs">Tracking Timeline</h4>
                      <button
                        onClick={handleRefreshTracking}
                        className="text-[11px] text-[#237A3B] font-bold flex items-center gap-1 hover:underline"
                      >
                        <RefreshCw className="w-3 h-3" /> Refresh Tracking
                      </button>
                    </div>

                    <div className="space-y-3 border-l-2 border-[#8BCF9B] ml-3 pl-4">
                      {trackingData.history.map((step, idx) => (
                        <div key={idx} className="relative space-y-0.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#237A3B] absolute -left-[21px] top-1" />
                          <span className="font-bold text-gray-900 block">{step.activity}</span>
                          <span className="text-[11px] text-gray-500 block">{step.location}</span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(step.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                    <button
                      onClick={() => handlePrintShippingLabel(trackingOrder.shipment?.labelUrl || undefined)}
                      className="px-4 py-2 bg-[#237A3B] hover:bg-[#1c6330] text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-xs"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download / Print Label</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400 space-y-2">
                  <p>No tracking details found for this order.</p>
                  <button
                    onClick={handleRefreshTracking}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 font-semibold rounded-xl inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry Track
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video & QR Management Modal */}
      {videoOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-6">
            <div className="p-5 bg-[#237A3B] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#8BCF9B] font-bold">
                  Personalised Video & QR Card Hub
                </span>
                <h3 className="font-bold text-sm">Order {videoOrder.orderNumber}</h3>
              </div>
              <button onClick={() => setVideoOrder(null)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs">
              <form onSubmit={handleSaveVideo} className="space-y-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Customer Video Link (YouTube / Cloudinary / MP4 URL)
                  </label>
                  <input
                    type="url"
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="https://youtu.be/xxx or https://res.cloudinary.com/..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Video Processing Status</label>
                  <select
                    value={videoStatusInput}
                    onChange={(e) => setVideoStatusInput(e.target.value as VideoStatus)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  >
                    <option value="VIDEO_REQUIRED">Video Required (Awaiting Customer)</option>
                    <option value="VIDEO_PROCESSING">Video Processing</option>
                    <option value="VIDEO_READY">Video Ready & QR Card Printable</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    disabled={isSavingVideo}
                    className="px-4 py-2 bg-[#237A3B] text-white font-bold rounded-xl shadow-xs"
                  >
                    {isSavingVideo ? 'Saving...' : 'Save Video & Status'}
                  </button>
                </div>
              </form>

              {qrCodeData && (
                <div className="border-t border-gray-100 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 text-sm">Printable Hamper Greeting QR Card</h4>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Card</span>
                    </button>
                  </div>

                  <div className="p-6 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border-2 border-dashed border-[#8BCF9B] flex flex-col sm:flex-row items-center gap-6">
                    <img
                      src={qrCodeData.qrDataUrl}
                      alt="Personalized Video QR"
                      className="w-36 h-36 rounded-xl border border-gray-200 shadow-sm bg-white p-2"
                    />
                    <div className="space-y-1.5 text-center sm:text-left flex-1">
                      <span className="text-[10px] text-[#237A3B] uppercase font-bold tracking-wider">
                        Scan with any smartphone camera
                      </span>
                      <h5 className="font-bold text-gray-900 text-base">
                        A Special Video Message For You!
                      </h5>
                      <p className="text-gray-600 text-xs italic">
                        "{videoOrder.personalizationNote || 'Thinking of you with love and care.'}"
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fulfillment Status & Packing Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-[#237A3B] text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#8BCF9B] font-bold">
                  Order Management & Packing Checklist
                </span>
                <h3 className="font-bold text-base sm:text-lg">Order #{selectedOrder.orderNumber}</h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-white/80 hover:text-white p-1">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* Customer Personalization Section */}
              {(() => {
                const itemPhotos: { url: string; itemName: string }[] = [];
                let itemMessage: string | null = null;

                if (selectedOrder.items && selectedOrder.items.length > 0) {
                  for (const itm of selectedOrder.items) {
                    const snap: any = itm.snapshot || {};
                    const pers: any = snap.personalization || itm.personalization || {};
                    const photos: string[] = pers.photos || pers.attachedPhotos || snap.attachedPhotos || [];
                    for (const p of photos) {
                      if (p && !itemPhotos.some((ip) => ip.url === p)) {
                        itemPhotos.push({ url: p, itemName: itm.name });
                      }
                    }
                    if (!itemMessage && (pers.customMessage || pers.message || snap.message)) {
                      itemMessage = pers.customMessage || pers.message || snap.message;
                    }
                  }
                }

                const topPhotos: string[] = selectedOrder.uploadedPhotos || (selectedOrder.shippingAddress as any)?.uploadedPhotos || [];
                for (const p of topPhotos) {
                  if (p && !itemPhotos.some((ip) => ip.url === p)) {
                    itemPhotos.push({ url: p, itemName: 'Gift Personalization' });
                  }
                }

                const finalMessage = itemMessage || selectedOrder.personalizationNote || (selectedOrder.shippingAddress as any)?.personalizationNote;
                const hasPersonalization = itemPhotos.length > 0 || !!finalMessage;

                if (!hasPersonalization) return null;

                return (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#F1FAF3] to-emerald-50/60 border-2 border-[#8BCF9B] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#8BCF9B]/40">
                      <div className="flex items-center gap-2 text-[#237A3B]">
                        <Heart className="w-4 h-4 fill-current" />
                        <h4 className="font-extrabold text-sm uppercase tracking-wide">
                          Customer Personalization (Keepsake Gift)
                        </h4>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#237A3B] text-white text-[10px] font-bold">
                        🎁 Keepsake Card Item
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-100/60 border border-emerald-200 text-emerald-950 font-bold text-xs flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#237A3B] shrink-0" />
                      <span>This hamper contains customer-provided photos and custom greeting note.</span>
                    </div>

                    {finalMessage && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                          Personalized Greeting Message (Printed on Card):
                        </span>
                        <div className="p-3 bg-white rounded-xl border border-gray-200 text-gray-800 font-serif italic text-xs leading-relaxed shadow-2xs">
                          "{finalMessage}"
                        </div>
                      </div>
                    )}

                    {itemPhotos.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                          Customer Uploaded Photos ({itemPhotos.length} photos):
                        </span>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {itemPhotos.map((photo, pIdx) => (
                            <div
                              key={pIdx}
                              className="relative group aspect-square rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-xs flex flex-col justify-between"
                            >
                              <img
                                src={photo.url}
                                alt={`Customer photo ${pIdx + 1}`}
                                className="w-full h-full object-cover"
                              />

                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                                <button
                                  type="button"
                                  onClick={() => setPreviewAdminPhotoUrl(photo.url)}
                                  className="p-2 rounded-xl bg-white text-gray-800 hover:bg-gray-100 shadow-md transition-colors"
                                  title="Enlarge preview"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <a
                                  href={photo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="p-2 rounded-xl bg-[#237A3B] text-white hover:bg-[#1c6330] shadow-md transition-colors"
                                  title="Open / Download full resolution"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>

                              <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                                Photo #{pIdx + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Shipping & Payment Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Payment Mode</span>
                  <span className="font-bold text-[#237A3B]">
                    {selectedOrder.paymentProvider === 'DEMO' || selectedOrder.transactionId?.startsWith('demo_')
                      ? 'DEMO'
                      : (selectedOrder.paymentProvider || 'RAZORPAY')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Payment Status</span>
                  <span className={`font-bold ${
                    selectedOrder.paymentStatus === 'PAID' ? 'text-emerald-700' : selectedOrder.paymentStatus === 'FAILED' ? 'text-red-600' : 'text-amber-700'
                  }`}>
                    {selectedOrder.paymentStatus}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Amount</span>
                  <span className="font-bold text-gray-900">
                    {selectedOrder.currency} {selectedOrder.total.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Nimbus AWB</span>
                  <span className="font-mono text-[11px] text-gray-700 truncate block" title={selectedOrder.shipment?.awbNumber || selectedOrder.trackingNumber || 'Unbooked'}>
                    {selectedOrder.shipment?.awbNumber || selectedOrder.trackingNumber || 'Unbooked'}
                  </span>
                </div>
              </div>

              {/* Order Status & Tracking Form */}
              <form onSubmit={handleUpdateStatus} className="space-y-4 pt-1">
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                  Update Order Fulfillment Status
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Fulfillment Status</label>
                    <select
                      value={newOrderStatus}
                      onChange={(e) => setNewOrderStatus(e.target.value as OrderStatus)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="PACKED">Packed</option>
                      <option value="SHIPPED">Shipped</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="REFUNDED">Refunded</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Payment Status</label>
                    <select
                      value={newPaymentStatus}
                      onChange={(e) => setNewPaymentStatus(e.target.value as PaymentStatus)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                      <option value="FAILED">Failed</option>
                      <option value="REFUNDED">Refunded</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Courier Tracking / AWB Number</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g. NP-DLH-892348123"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Status Timeline Note</label>
                  <input
                    type="text"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="e.g. Dispatched from Bengaluru Central Medical Hub"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2 bg-[#237A3B] text-white font-bold rounded-xl shadow-md"
                  >
                    {isUpdating ? 'Updating...' : 'Update Order Status'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Admin Full-Resolution Photo Lightbox */}
      {previewAdminPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-[#237A3B] text-white flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                <span>Customer Uploaded Keepsake Photo</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewAdminPhotoUrl(null)}
                className="text-white/80 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-gray-900 flex items-center justify-center max-h-[75vh]">
              <img
                src={previewAdminPhotoUrl}
                alt="Enlarged customer keepsake photo"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500">Inspect print resolution before greeting card generation.</span>
              <div className="flex gap-2">
                <a
                  href={previewAdminPhotoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Full Res</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAdminPhotoUrl(null)}
                  className="px-4 py-2 bg-[#237A3B] text-white font-bold rounded-xl"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
