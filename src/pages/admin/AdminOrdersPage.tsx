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
  ShieldCheck,
  RotateCcw,
  Copy,
  Check,
  Share2,
  Send,
  MessageCircle,
  Globe,
  ArrowRight,
  ChevronDown,
  Zap,
  Calendar,
  ClipboardList,
  Gift,
  CheckSquare,
  Square,
  ClipboardCheck,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { Order, OrderStatus, PaymentStatus, VideoStatus, NimbusTrackingResult, ShippingInfo, OrderPackageDetails, isHamperItem } from '../../types';
import { ordersApi, shippingApi } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../../context/ToastContext';
import { useCountryCurrency } from '../../context/CountryCurrencyContext';
import { useAuth } from '../../context/AuthContext';

export const AdminOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { formatPrice } = useCountryCurrency();

  const [orders, setOrders] = useState<Order[]>([]);
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [videoFilter, setVideoFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Status edit modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newOrderStatus, setNewOrderStatus] = useState<OrderStatus>('PENDING');
  const [newPaymentStatus, setNewPaymentStatus] = useState<PaymentStatus>('PENDING');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Track open Shipping Action Menu in table
  const [shippingMenuOpenOrderId, setShippingMenuOpenOrderId] = useState<string | null>(null);

  // Option B: NimbusPost Automated Shipment Modal State
  const [nimbusAutoShipOrder, setNimbusAutoShipOrder] = useState<Order | null>(null);
  const [nimbusPackageDetails, setNimbusPackageDetails] = useState<OrderPackageDetails | null>(null);
  const [isLoadingPackageDetails, setIsLoadingPackageDetails] = useState(false);
  const [selectedAutoCourier, setSelectedAutoCourier] = useState('Delhivery Surface Express');
  const [isBookingAutoShipment, setIsBookingAutoShipment] = useState(false);
  const [autoShipError, setAutoShipError] = useState<string | null>(null);

  // NimbusPost Live Sync State
  const [isSyncingNimbusOrderId, setIsSyncingNimbusOrderId] = useState<string | null>(null);

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

  // Manual Courier Shipment Modal State
  const [manualShipOrder, setManualShipOrder] = useState<Order | null>(null);
  const [manualCourierName, setManualCourierName] = useState('India Post (Speed Post)');
  const [manualCustomCourier, setManualCustomCourier] = useState('');
  const [manualTrackingNumber, setManualTrackingNumber] = useState('');
  const [manualTrackingUrl, setManualTrackingUrl] = useState('https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx');
  const [manualDispatchDate, setManualDispatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualEstimatedDelivery, setManualEstimatedDelivery] = useState('3-5 business days');
  const [manualShippingNotes, setManualShippingNotes] = useState('');
  const [isSavingManualShipment, setIsSavingManualShipment] = useState(false);
  const [isResettingShipment, setIsResettingShipment] = useState<string | null>(null);

  // Success Dialog for Manual Shipment
  const [createdManualShipment, setCreatedManualShipment] = useState<{
    orderNumber: string;
    courierName: string;
    trackingNumber: string;
    trackingUrl?: string;
    webTrackUrl: string;
    customerPhone?: string;
    customerName?: string;
  } | null>(null);

  const POPULAR_COURIERS = [
    { name: 'India Post (Speed Post)', url: 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx', icon: '🇮🇳' },
    { name: 'DTDC Express', url: 'https://www.dtdc.in/tracking.asp', icon: '🚚' },
    { name: 'Blue Dart Express', url: 'https://www.bluedart.com/tracking', icon: '⚡' },
    { name: 'The Professional Couriers', url: 'https://www.tpcindia.com', icon: '📦' },
    { name: 'Delhivery Direct', url: 'https://www.delhivery.com/tracking', icon: '🏢' },
    { name: 'ST Courier', url: 'https://stcourier.com/track', icon: '📬' },
    { name: 'Trackon Couriers', url: 'https://trackon.in', icon: '📍' },
    { name: 'FedEx India', url: 'https://www.fedex.com/en-in/tracking.html', icon: '🌐' },
    { name: 'DHL Express', url: 'https://www.dhl.com/in-en/home/tracking.html', icon: '✈️' },
    { name: 'Local / Hand Delivery', url: '', icon: '🤝' },
    { name: 'Other Courier', url: '', icon: '✏️' },
  ];

  const handleOpenManualShipModal = (ord: Order) => {
    setManualShipOrder(ord);
    const existingCourier = ord.shipment?.courierName || '';
    const match = POPULAR_COURIERS.find((c) => c.name.toLowerCase() === existingCourier.toLowerCase());
    if (match) {
      setManualCourierName(match.name);
      setManualCustomCourier('');
      setManualTrackingUrl(ord.shipment?.trackingUrl || match.url);
    } else if (existingCourier) {
      setManualCourierName('Other Courier');
      setManualCustomCourier(existingCourier);
      setManualTrackingUrl(ord.shipment?.trackingUrl || '');
    } else {
      setManualCourierName('India Post (Speed Post)');
      setManualCustomCourier('');
      setManualTrackingUrl('https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx');
    }
    setManualTrackingNumber(ord.shipment?.trackingNumber || ord.trackingNumber || '');
    setManualDispatchDate(
      ord.shipment?.dispatchedAt
        ? new Date(ord.shipment.dispatchedAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    );
    setManualEstimatedDelivery(ord.shipment?.estimatedDelivery || '3-5 business days');
    setManualShippingNotes(ord.shipment?.shippingNotes || '');
  };

  const handleSelectCourier = (name: string) => {
    setManualCourierName(name);
    const match = POPULAR_COURIERS.find((c) => c.name === name);
    if (match && match.url) {
      setManualTrackingUrl(match.url);
    }
  };

  const handleSaveManualShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualShipOrder) return;

    const finalCourierName = manualCourierName === 'Other Courier' ? manualCustomCourier.trim() : manualCourierName;
    if (!finalCourierName) {
      showToast('Please specify a courier or carrier name.', 'error');
      return;
    }
    if (!manualTrackingNumber.trim()) {
      showToast('Please enter a tracking ID / consignment number.', 'error');
      return;
    }

    setIsSavingManualShipment(true);
    try {
      const res = await shippingApi.createManualShipment({
        orderId: manualShipOrder.id,
        courierName: finalCourierName,
        trackingNumber: manualTrackingNumber.trim(),
        trackingUrl: manualTrackingUrl.trim() || undefined,
        dispatchDate: manualDispatchDate || undefined,
        estimatedDelivery: manualEstimatedDelivery.trim() || undefined,
        shippingNotes: manualShippingNotes.trim() || undefined,
        notifyCustomer: true,
      });

      if (res.data?.success) {
        showToast(
          `✓ Order #${manualShipOrder.orderNumber} dispatched via ${finalCourierName}! Tracking ID published to the web.`,
          'success'
        );

        const webTrackUrl = `${window.location.origin}/track?order=${manualShipOrder.orderNumber}`;
        const customerPhone =
          manualShipOrder.recipient?.phone || manualShipOrder.guestPhone || manualShipOrder.buyer?.phone;
        const customerName =
          manualShipOrder.recipient?.name || manualShipOrder.buyer?.name || 'Customer';

        setCreatedManualShipment({
          orderNumber: manualShipOrder.orderNumber,
          courierName: finalCourierName,
          trackingNumber: manualTrackingNumber.trim(),
          trackingUrl: manualTrackingUrl.trim() || undefined,
          webTrackUrl,
          customerPhone,
          customerName,
        });

        setManualShipOrder(null);
        loadOrders();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save manual shipment.', 'error');
    } finally {
      setIsSavingManualShipment(false);
    }
  };

  const handleResetShipment = async (ord: Order) => {
    if (!window.confirm(`Reset shipment for order #${ord.orderNumber} back to unfulfilled?`)) return;
    setIsResettingShipment(ord.id);
    try {
      const res = await shippingApi.resetShipment(ord.id);
      if (res.data?.success) {
        showToast(`Shipment for #${ord.orderNumber} reset. You can now select NimbusPost or Manual Dispatch.`, 'success');
        loadOrders();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to reset shipment.', 'error');
    } finally {
      setIsResettingShipment(null);
    }
  };

  const copyToClipboard = (text: string, label = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text);
    showToast(label, 'success');
  };

  const shareViaWhatsApp = (data: {
    customerPhone?: string;
    customerName?: string;
    orderNumber: string;
    courierName: string;
    trackingNumber: string;
    trackingUrl?: string;
    webTrackUrl: string;
  }) => {
    const phone = (data.customerPhone || '').replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Hello ${data.customerName || 'Valued Customer'}, your Nest Care Connect healthcare package (#${data.orderNumber}) has been dispatched!\n\n` +
      `📦 Courier: ${data.courierName}\n` +
      `🔖 Tracking ID: ${data.trackingNumber}\n` +
      `🌐 Track Online on our Web Portal: ${data.webTrackUrl}\n` +
      (data.trackingUrl ? `🔗 Direct Carrier Link: ${data.trackingUrl}\n` : '') +
      `\nThank you for choosing Nest Care Connect!`
    );
    const waUrl = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${message}`
      : `https://api.whatsapp.com/send?text=${message}`;
    window.open(waUrl, '_blank');
  };

  const {
    data: queryOrders,
    isLoading: isOrdersLoading,
    isFetching: isOrdersFetching,
    isError: isOrdersError,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['admin-orders', statusFilter, videoFilter, searchQuery],
    queryFn: async () => {
      const res = await ordersApi.getAdminOrders({
        search: searchQuery,
        status: statusFilter || undefined,
        videoStatus: videoFilter || undefined,
      });
      return (res.data?.data?.orders || []) as Order[];
    },
    placeholderData: (previousData) => previousData,
    staleTime: 30000,
  });

  const { data: queryShippingInfo } = useQuery({
    queryKey: ['admin-shipping-info'],
    queryFn: async () => {
      const res = await shippingApi.getInfo();
      return (res.data?.data || null) as ShippingInfo | null;
    },
    staleTime: 10 * 60000,
  });

  useEffect(() => {
    if (queryOrders !== undefined) {
      setOrders(queryOrders);
      setIsLoading(false);
    }
  }, [queryOrders]);

  useEffect(() => {
    if (queryShippingInfo) {
      setShippingInfo(queryShippingInfo);
    }
  }, [queryShippingInfo]);

  useEffect(() => {
    if (isOrdersError) {
      setIsLoading(false);
    }
  }, [isOrdersError]);

  const loadOrders = () => {
    refetchOrders();
  };

  // Packing checklist state
  const [packingState, setPackingState] = useState<Record<string, boolean>>({});

  const handleOpenStatusModal = (ord: Order) => {
    setSelectedOrder(ord);
    setNewOrderStatus(ord.orderStatus);
    setNewPaymentStatus(ord.paymentStatus);
    setTrackingNumber(ord.trackingNumber || ord.shipment?.awbNumber || '');
    setStatusNote('');
    setPackingState(ord.packingChecklist?.packedItems || {});
  };

  const handleTogglePackingItem = async (itemId: string) => {
    if (!selectedOrder) return;
    const nextPacked = {
      ...packingState,
      [itemId]: !packingState[itemId],
    };
    setPackingState(nextPacked);

    try {
      const res = await ordersApi.updatePackingChecklist(selectedOrder.id, {
        packedItems: nextPacked,
      });
      if (res.data?.success && res.data?.data) {
        const updated = res.data.data;
        setSelectedOrder(updated);
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      }
    } catch {
      showToast('Could not save checklist state.', 'error');
    }
  };

  const handleResetPackingChecklist = async () => {
    if (!selectedOrder) return;
    if (!window.confirm(`Reset packing checklist for Order #${selectedOrder.orderNumber}?`)) return;
    setPackingState({});
    try {
      const res = await ordersApi.updatePackingChecklist(selectedOrder.id, {
        resetAll: true,
      });
      if (res.data?.success && res.data?.data) {
        const updated = res.data.data;
        setSelectedOrder(updated);
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        showToast('Packing checklist has been reset.', 'info');
      }
    } catch {
      showToast('Could not reset checklist.', 'error');
    }
  };

  const handlePrintGreetingCard = (orderNumber: string, recipientName: string, message: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Personal Greeting Card - #${orderNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,400&family=Plus+Jakarta+Sans:wght@400;600&display=swap');
            body { margin: 0; padding: 40px; background: #fdfcf9; display: flex; align-items: center; justify-content: center; min-height: 80vh; }
            .card { width: 100%; max-width: 520px; border: 2px solid #8BCF9B; border-radius: 24px; padding: 40px; background: #ffffff; box-shadow: 0 10px 25px rgba(35,122,59,0.08); text-align: center; }
            .brand { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #237A3B; text-transform: uppercase; margin-bottom: 24px; }
            .to { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 600; color: #1e293b; margin-bottom: 16px; }
            .message { font-family: 'Playfair Display', serif; font-size: 16px; line-height: 1.8; font-style: italic; color: #334155; margin-bottom: 30px; }
            .footer { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">🌿 Nest Care Connect · Personal Keepsake</div>
            <div class="to">For Dearest ${recipientName}</div>
            <div class="message">"${message}"</div>
            <div class="footer">
              <span>Order #${orderNumber}</span>
              <span>Nest Care Connect · With Love Across The Miles</span>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleOpenNimbusShipModal = (ord: Order) => {
    handleOpenNimbusAutoShipModal(ord);
  };

  // Option B: Open NimbusPost Automated Dispatch Modal
  const handleOpenNimbusAutoShipModal = async (ord: Order) => {
    setNimbusAutoShipOrder(ord);
    setNimbusPackageDetails(null);
    setAutoShipError(null);
    setSelectedAutoCourier(shippingInfo?.defaultCourier || 'Delhivery Surface Express');
    setIsLoadingPackageDetails(true);
    try {
      const res = await shippingApi.getOrderPackageDetails(ord.id);
      if (res.data?.success && res.data.data) {
        setNimbusPackageDetails(res.data.data);
      }
    } catch (err: any) {
      console.warn('Could not load package details:', err);
    } finally {
      setIsLoadingPackageDetails(false);
    }
  };

  // Option B: Confirm NimbusPost Automated Dispatch via API
  const handleConfirmAutoNimbusShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nimbusAutoShipOrder || isBookingAutoShipment) return;

    setIsBookingAutoShipment(true);
    setAutoShipError(null);
    try {
      const res = await shippingApi.createNimbusPostAutomatedShipment({
        orderId: nimbusAutoShipOrder.id,
        courierName: selectedAutoCourier,
      });

      if (res.data?.success && res.data.data) {
        const orderData: any = res.data.data;
        const shipment: any = orderData.shipment || orderData;
        const awb = shipment.awbNumber || orderData.trackingNumber || 'AWB-ASSIGNED';
        const isSim = Boolean(shipment.isSimulated || shipment.shipmentStatus === 'SIMULATED_TEST');

        if (isSim) {
          showToast(
            `Sandbox simulation generated for #${nimbusAutoShipOrder.orderNumber}! Ref: ${awb}`,
            'info'
          );
        } else {
          showToast(
            `✓ Live NimbusPost shipment created for #${nimbusAutoShipOrder.orderNumber}! AWB: ${awb}`,
            'success'
          );
        }

        setCreatedTestShipment({
          orderNumber: nimbusAutoShipOrder.orderNumber,
          shipmentId: shipment.id || shipment.providerOrderId || 'NIMBUS-ID',
          awbNumber: awb,
          courierName: selectedAutoCourier,
          labelUrl: shipment.labelUrl || undefined,
        });

        setNimbusAutoShipOrder(null);
        loadOrders();
      } else {
        throw new Error(res.data?.message || 'Failed to dispatch shipment via NimbusPost.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to book NimbusPost shipment.';
      setAutoShipError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsBookingAutoShipment(false);
    }
  };



  // Synchronize status and AWB tracking anytime from NimbusPost
  const handleSyncNimbusShipment = async (ord: Order) => {
    if (isSyncingNimbusOrderId) return;
    setIsSyncingNimbusOrderId(ord.id);
    try {
      const res = await shippingApi.syncNimbusShipment(ord.id);
      if (res.data?.success) {
        showToast(res.data.message || 'Shipment status synchronized from NimbusPost.', 'success');
        loadOrders();
      } else {
        throw new Error(res.data?.message || 'Failed to sync with NimbusPost.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to sync with NimbusPost.';
      showToast(errMsg, 'error');
    } finally {
      setIsSyncingNimbusOrderId(null);
    }
  };

  const handleCopyAllOrderDetails = (pkg: OrderPackageDetails) => {
    const lines = [
      `Website Order ID: #${pkg.orderNumber}`,
      `Customer Name: ${pkg.customerName}`,
      `Customer Phone: ${pkg.customerPhone}`,
      `Shipping Address: ${pkg.fullAddressString}`,
      `Products Ordered: ${pkg.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}`,
      `Actual Package Weight: ${pkg.packageWeightKg} kg`,
      `Package Dimensions: ${pkg.dimensionsString}`,
      `Chargeable Weight: ${pkg.chargeableWeightKg} kg`,
      `Order Total Value: ${pkg.currency} ${pkg.orderValue}`,
      `Pickup Hub: ${pkg.pickupHub.hubName} (PIN: ${pkg.pickupHub.pincode})`,
    ];
    copyToClipboard(lines.join('\n'), 'Full order & package summary copied! Ready to paste into NimbusPost.');
  };

  const handleBookNimbusShipment = async (e: React.FormEvent) => {
    await handleConfirmAutoNimbusShipment(e);
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

  const getOrderProductSummary = (ord: Order) => {
    const summaryItems: { name: string; qty: number; isHamper?: boolean }[] = [];
    let totalDistinct = 0;

    for (const itm of ord.items || []) {
      const isHamper = isHamperItem(itm);
      const snap: any = itm.snapshot || {};
      const breakdown: any[] = snap.breakdown || [];
      const box = snap.box;

      if (isHamper) {
        summaryItems.push({
          name: itm.name,
          qty: itm.quantity,
          isHamper: true,
        });
        totalDistinct++;

        if (box?.name) {
          summaryItems.push({
            name: box.name,
            qty: itm.quantity,
          });
          totalDistinct++;
        }

        for (const b of breakdown) {
          const v = b.variant || b.unit;
          summaryItems.push({
            name: `${b.name}${v && v !== 'Standard' ? ` (${v})` : ''}`,
            qty: b.quantity || 1,
          });
          totalDistinct++;
        }
      } else {
        const v = itm.variant || snap.variant || snap.unit;
        summaryItems.push({
          name: `${itm.name}${v && v !== 'Standard' ? ` (${v})` : ''}`,
          qty: itm.quantity,
          isHamper: false,
        });
        totalDistinct++;
      }
    }

    return {
      summaryItems,
      totalDistinct,
      totalCount: (ord.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0),
    };
  };

  interface PackingChecklistItem {
    id: string;
    name: string;
    variant?: string;
    sku?: string;
    quantity: number;
    image?: string;
    hamperName?: string;
    isBox?: boolean;
    isMessage?: boolean;
  }

  const getPackingChecklistItems = (ord: Order): { [groupName: string]: PackingChecklistItem[] } => {
    const groups: { [groupName: string]: PackingChecklistItem[] } = {};

    (ord.items || []).forEach((itm, itmIdx) => {
      const isHamper = isHamperItem(itm);
      const snap: any = itm.snapshot || {};
      const breakdown: any[] = snap.breakdown || [];
      const box = snap.box;

      if (isHamper) {
        const groupTitle = `${itm.quantity > 1 ? `${itm.quantity} × ` : ''}${itm.name}`;
        groups[groupTitle] = [];

        // Hamper Box
        if (box?.name) {
          const variantText = [box.size ? `Size: ${box.size}` : null, box.color ? `Color: ${box.color}` : null]
            .filter(Boolean)
            .join(' · ');
          groups[groupTitle].push({
            id: `box_${itm.id || itmIdx}_${box.id || 'box'}`,
            name: box.name,
            variant: variantText || undefined,
            quantity: itm.quantity,
            image: box.image,
            hamperName: itm.name,
            isBox: true,
          });
        }

        // Constituent items
        if (breakdown.length > 0) {
          breakdown.forEach((b: any, bIdx: number) => {
            const v = b.variant || b.unit || 'Standard';
            groups[groupTitle].push({
              id: `item_${itm.id || itmIdx}_prod_${b.productId || bIdx}`,
              name: b.name,
              variant: v !== 'Standard' ? v : undefined,
              sku: b.sku,
              quantity: b.quantity || 1,
              image: b.image || b.images?.[0],
              hamperName: itm.name,
            });
          });
        } else {
          groups[groupTitle].push({
            id: `item_${itm.id || itmIdx}`,
            name: itm.name,
            sku: itm.sku || undefined,
            quantity: itm.quantity,
            image: itm.image || snap.image,
            hamperName: itm.name,
          });
        }

        // Greeting Card if personal message exists
        const msg = itm.personalization?.customMessage || itm.personalization?.message || ord.personalizationNote || (ord.shippingAddress as any)?.personalizationNote;
        if (msg) {
          groups[groupTitle].push({
            id: `card_${itm.id || itmIdx}`,
            name: 'Printed Keepsake Greeting Card (Personal Message)',
            variant: 'Physical Card inside Hamper Box',
            quantity: itm.quantity,
            hamperName: itm.name,
            isMessage: true,
          });
        }
      } else {
        const groupTitle = 'Normal Products';
        if (!groups[groupTitle]) groups[groupTitle] = [];

        const v = itm.variant || snap.variant || snap.unit || 'Standard';
        groups[groupTitle].push({
          id: `prod_${itm.id || itmIdx}_${itm.productId || 'p'}`,
          name: itm.name,
          variant: v !== 'Standard' ? v : undefined,
          sku: itm.sku || snap.sku,
          quantity: itm.quantity,
          image: itm.image || snap.image,
        });
      }
    });

    return groups;
  };

  const filteredOrders = orders.filter((o) => {
    if (paymentFilter && o.paymentStatus !== paymentFilter) return false;
    if (statusFilter && o.orderStatus !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.guestName?.toLowerCase().includes(q) ||
      o.buyer?.name?.toLowerCase().includes(q) ||
      o.recipient?.name?.toLowerCase().includes(q) ||
      o.guestEmail?.toLowerCase().includes(q) ||
      o.trackingNumber?.toLowerCase().includes(q) ||
      o.shipment?.awbNumber?.toLowerCase().includes(q) ||
      o.paymentId?.toLowerCase().includes(q) ||
      o.transactionId?.toLowerCase().includes(q)
    );
  });

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
              Manage orders, Razorpay payments, book & track NimbusPost courier shipments (Blue Dart, Delhivery, Shadowfax), and fulfill family gift hampers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Refresh Orders Button */}
            <button
              onClick={() => refetchOrders()}
              disabled={isOrdersFetching}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl text-gray-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh order records from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#237A3B] ${isOrdersFetching ? 'animate-spin' : ''}`} />
              <span>{isOrdersFetching ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {/* NimbusPost Test Mode Indicator */}
            <div className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold">
              <Truck className="w-4 h-4 text-[#237A3B]" />
              <span>NIMBUSPOST TEST MODE</span>
            </div>
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
              <span className="text-gray-500 font-medium">Payment:</span>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:border-[#8BCF9B] outline-none"
              >
                <option value="">All Payments</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
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
                  <th className="p-4">Ordered Products</th>
                  <th className="p-4">Payment & Total</th>
                  <th className="p-4">Shipping & Fulfillment</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {isOrdersLoading || (isLoading && orders.length === 0) ? (
                  <tr>
                    <td colSpan={8} className="py-20 px-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#237A3B] flex items-center justify-center shadow-2xs">
                          <Loader2 className="w-6 h-6 animate-spin text-[#237A3B]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">Loading orders...</p>
                          <p className="text-xs text-gray-500 mt-0.5">Fetching latest orders and fulfillment records from database</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : isOrdersError ? (
                  <tr>
                    <td colSpan={8} className="py-16 px-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-2xs">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">Unable to load orders</p>
                          <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
                            {(ordersError as any)?.response?.data?.message ||
                              (ordersError as any)?.message ||
                              'A network or server error occurred while retrieving order data.'}
                          </p>
                        </div>
                        <button
                          onClick={() => refetchOrders()}
                          className="mt-1 px-4 py-2 bg-[#237A3B] hover:bg-[#1c6330] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 px-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center shadow-2xs">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">No orders found matching current filters.</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {searchQuery || statusFilter || paymentFilter || videoFilter
                              ? 'Try adjusting your search query or clearing active filters.'
                              : 'No customer orders have been placed in the database yet.'}
                          </p>
                        </div>
                        {(searchQuery || statusFilter || paymentFilter || videoFilter) && (
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setStatusFilter('');
                              setPaymentFilter('');
                              setVideoFilter('');
                            }}
                            className="mt-1 px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                          >
                            Clear All Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const method = ord.shippingMethod || ord.shipment?.shippingMethod;
                    const isManual = method === 'MANUAL' || ord.shipment?.provider === 'MANUAL';
                    const isNimbus = !isManual && (method === 'NIMBUSPOST_AUTOMATED' || method === 'NIMBUSPOST' || ord.shipment?.provider === 'NIMBUSPOST');

                    const awb = ord.shipment?.trackingNumber || ord.shipment?.awbNumber || ord.trackingNumber;
                    const courier = ord.shipment?.courierName || (isManual ? 'Direct Courier' : 'Nimbus Courier');

                    const isFailedShipment =
                      !isManual &&
                      (ord.shipment?.shipmentStatus === 'SHIPMENT_CREATION_FAILED' ||
                        ord.shipment?.shipmentStatus === 'FAILED' ||
                        (ord.shipment && !awb && ord.shipment.errorMessage));

                    const isSimulatedShipment =
                      !isManual &&
                      (ord.shipment?.shipmentStatus === 'SIMULATED_TEST' ||
                        Boolean(ord.shipment?.awbNumber?.startsWith('SIMULATED-')) ||
                        Boolean(ord.shipment?.awbNumber?.startsWith('TEST-NP-') && ord.orderStatus !== 'SHIPPED'));

                    const isShipped = Boolean(
                      awb && (ord.orderStatus === 'SHIPPED' || ord.orderStatus === 'DELIVERED') && !isSimulatedShipment && !isFailedShipment
                    );
                    const isManualDispatched = isShipped && isManual;
                    const isNimbusLiveBooked = isShipped && isNimbus;

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

                        {/* Ordered Products Column */}
                        <td className="p-4 min-w-[210px] max-w-[270px]">
                          {(() => {
                            const { summaryItems, totalDistinct, totalCount } = getOrderProductSummary(ord);
                            if (summaryItems.length === 0) {
                              return <span className="text-gray-400 italic text-[11px]">No items</span>;
                            }
                            const visibleItems = summaryItems.slice(0, 3);
                            const hasMore = totalDistinct > visibleItems.length;

                            return (
                              <div className="space-y-1">
                                {visibleItems.map((item, iIdx) => (
                                  <div
                                    key={iIdx}
                                    className="flex items-start gap-1.5 text-[11px] leading-tight text-gray-800"
                                    title={item.name}
                                  >
                                    <span className="font-bold text-[#237A3B] shrink-0 font-mono text-[10px] mt-0.5">
                                      {item.qty} ×
                                    </span>
                                    <span className="truncate font-medium">{item.name}</span>
                                  </div>
                                ))}

                                {hasMore ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenStatusModal(ord)}
                                    className="text-[10px] font-bold text-[#237A3B] hover:text-[#1c6330] hover:underline flex items-center gap-1 pt-0.5 cursor-pointer"
                                  >
                                    <span>
                                      {totalCount} Products · View Details
                                    </span>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenStatusModal(ord)}
                                    className="text-[10px] font-bold text-gray-400 hover:text-[#237A3B] flex items-center gap-1 pt-0.5 cursor-pointer"
                                  >
                                    <span>View Details</span>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })()}
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
                              {ord.paymentStatus === 'PAID'
                                ? '✓ Razorpay Paid'
                                : ord.paymentStatus === 'FAILED'
                                ? 'Payment Failed'
                                : 'Pending Payment'}
                            </span>
                          </div>
                          {(ord.transactionId || ord.paymentId) && (
                            <span className="font-mono text-[9px] text-gray-400 block truncate max-w-[130px] mt-0.5" title={ord.transactionId || ord.paymentId || undefined}>
                              {ord.transactionId || ord.paymentId}
                            </span>
                          )}
                        </td>

                        {/* Shipping & Fulfillment Column */}
                        <td className="p-4">
                          {isShipped ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-900">
                                {isManual ? (
                                  <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                ) : (
                                  <Truck className="w-3.5 h-3.5 text-[#237A3B] shrink-0" />
                                )}
                                <span>{courier}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-mono text-[10px] px-2 py-0.5 rounded-md inline-block font-semibold border ${
                                  isManual
                                    ? 'text-indigo-950 bg-indigo-50 border-indigo-200'
                                    : 'text-emerald-950 bg-emerald-50 border-emerald-200'
                                }`}>
                                  {awb}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(awb || '', 'Tracking ID copied!')}
                                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                  title="Copy Tracking ID / AWB"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                                  isManual
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-emerald-100 text-[#237A3B]'
                                }`}>
                                  {isManual ? 'MANUAL' : 'NIMBUSPOST'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                                {ord.shipment?.trackingUrl ? (
                                  <a
                                    href={ord.shipment.trackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-semibold rounded flex items-center gap-1"
                                    title="Open tracking URL"
                                  >
                                    <span>Track</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                ) : isNimbus ? (
                                  <a
                                    href={`https://nimbuspost.com/track/${awb}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-[#237A3B] text-[10px] font-bold rounded flex items-center gap-1"
                                  >
                                    <span>Nimbus Track</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() =>
                                    copyToClipboard(
                                      `${window.location.origin}/track?order=${ord.orderNumber}`,
                                      'Customer tracking link copied!'
                                    )
                                  }
                                  className="px-2 py-0.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-[10px] font-semibold rounded flex items-center gap-1 transition-colors"
                                  title="Copy customer tracking portal link"
                                >
                                  <Globe className="w-2.5 h-2.5" />
                                  <span>Portal</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isManual) handleOpenManualShipModal(ord);
                                    else handleOpenNimbusAutoShipModal(ord);
                                  }}
                                  className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-semibold rounded transition-colors"
                                  title="Edit tracking ID or notes"
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleResetShipment(ord)}
                                  disabled={isResettingShipment === ord.id}
                                  className="px-1.5 py-0.5 text-gray-400 hover:text-red-600 text-[10px] rounded transition-colors"
                                  title="Reset shipment back to unfulfilled"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          ) : isFailedShipment ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  <span>DISPATCH_FAILED</span>
                                </span>
                              </div>
                              <span
                                className="text-[10px] text-gray-600 block line-clamp-2 max-w-[210px] leading-tight"
                                title={ord.shipment?.errorMessage || ord.errorMessage || 'Shipment creation failed'}
                              >
                                {ord.shipment?.errorMessage || ord.errorMessage || 'Shipment creation failed'}
                              </span>
                              <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleOpenNimbusAutoShipModal(ord)}
                                  className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold rounded flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Retry NimbusPost booking"
                                >
                                  <Zap className="w-2.5 h-2.5" />
                                  <span>Retry Nimbus</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenManualShipModal(ord)}
                                  className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Ship manually instead"
                                >
                                  <Send className="w-2.5 h-2.5" />
                                  <span>Ship Manually</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResetShipment(ord)}
                                  disabled={isResettingShipment === ord.id}
                                  className="px-1.5 py-0.5 text-gray-400 hover:text-red-600 text-[10px] rounded transition-colors cursor-pointer"
                                  title="Reset order shipping selection"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* NOT_IMPORTED / Awaiting Shipping Option Choice */
                            <div className="space-y-1.5 min-w-[150px]">
                              {ord.orderStatus === 'CANCELLED' ? (
                                <span className="text-gray-400 text-[11px] font-semibold italic block">
                                  Order Cancelled
                                </span>
                              ) : ord.paymentStatus !== 'PAID' ? (
                                <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-bold block w-fit">
                                  Awaiting Payment
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                      NOT_IMPORTED
                                    </span>
                                  </div>
                                  <div className="relative inline-block text-left w-full">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShippingMenuOpenOrderId(
                                          shippingMenuOpenOrderId === ord.id ? null : ord.id
                                        )
                                      }
                                      className="w-full px-2.5 py-1.5 bg-[#237A3B] hover:bg-[#1c6330] text-white text-[11px] font-bold rounded-xl shadow-xs flex items-center justify-between gap-1.5 transition-all"
                                      title="Select shipping method"
                                    >
                                      <div className="flex items-center gap-1 truncate">
                                        <Truck className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">Ship Order</span>
                                      </div>
                                      <ChevronDown
                                        className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                                          shippingMenuOpenOrderId === ord.id ? 'rotate-180' : ''
                                        }`}
                                      />
                                    </button>

                                  {shippingMenuOpenOrderId === ord.id && (
                                    <div className="absolute left-0 mt-1.5 w-64 z-50 bg-white rounded-2xl shadow-xl border border-gray-200 py-1.5 text-xs divide-y divide-gray-100">
                                      {/* Option A */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShippingMenuOpenOrderId(null);
                                          handleOpenManualShipModal(ord);
                                        }}
                                        className="w-full text-left px-3 py-2.5 hover:bg-indigo-50/80 flex items-start gap-2.5 transition-colors group"
                                      >
                                        <span className="p-1 rounded-lg bg-indigo-100 text-indigo-700 mt-0.5 group-hover:bg-indigo-200 shrink-0">
                                          <Send className="w-3.5 h-3.5" />
                                        </span>
                                        <div>
                                          <span className="font-bold text-gray-900 block group-hover:text-indigo-900 text-[11px]">
                                            Ship Manually
                                          </span>
                                          <span className="text-[10px] text-gray-500 block leading-tight">
                                            Speed Post, DTDC, Blue Dart, or local dispatch
                                          </span>
                                        </div>
                                      </button>

                                      {/* Option B */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShippingMenuOpenOrderId(null);
                                          handleOpenNimbusAutoShipModal(ord);
                                        }}
                                        className="w-full text-left px-3 py-2.5 hover:bg-emerald-50/80 flex items-start gap-2.5 transition-colors group cursor-pointer"
                                      >
                                        <span className="p-1 rounded-lg bg-emerald-100 text-[#237A3B] mt-0.5 group-hover:bg-emerald-200 shrink-0">
                                          <Zap className="w-3.5 h-3.5" />
                                        </span>
                                        <div>
                                          <span className="font-bold text-gray-900 block group-hover:text-[#237A3B] text-[11px]">
                                            Ship via NimbusPost
                                          </span>
                                          <span className="text-[10px] text-gray-500 block leading-tight">
                                            Select courier, inspect weight & generate AWB
                                          </span>
                                        </div>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                        {/* Order Status */}
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              ord.orderStatus === 'SHIPPED' || ord.orderStatus === 'DELIVERED'
                                ? 'bg-[#F1FAF3] text-[#237A3B] border-[#8BCF9B]/40'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            {ord.orderStatus}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {isManualDispatched && (
                              <button
                                type="button"
                                onClick={() =>
                                  shareViaWhatsApp({
                                    orderNumber: ord.orderNumber,
                                    courierName: courier,
                                    trackingNumber: awb || '',
                                    trackingUrl: ord.shipment?.trackingUrl || undefined,
                                    webTrackUrl: `${window.location.origin}/track?order=${ord.orderNumber}`,
                                    customerPhone:
                                      ord.recipient?.phone || ord.guestPhone || ord.buyer?.phone,
                                    customerName: ord.recipient?.name || ord.buyer?.name,
                                  })
                                }
                                className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1"
                                title="Share Tracking via WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden sm:inline">WhatsApp</span>
                              </button>
                            )}

                            {isNimbusLiveBooked && (
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

      {/* OPTION B: NimbusPost Automated Shipment Modal */}
      {nimbusAutoShipOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-6">
            <div className="p-5 bg-gradient-to-r from-[#237A3B] to-[#1c6330] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#8BCF9B] font-bold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Option B: Ship via NimbusPost (Automated)
                </span>
                <h3 className="font-bold text-base mt-0.5">Order #{nimbusAutoShipOrder.orderNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setNimbusAutoShipOrder(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950">
                <p className="font-medium text-[11px] leading-relaxed">
                  Review calculated package dimensions, customer shipping details, and chargeable weight before confirming automated dispatch with the NimbusPost API.
                </p>
              </div>

              {autoShipError && (
                <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="text-[11px]">
                    <strong className="block font-bold">NimbusPost Booking Error:</strong>
                    <span>{autoShipError}</span>
                  </div>
                </div>
              )}

              {/* Delivery Address */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  Delivery Destination
                </span>
                <p className="font-bold text-gray-900 text-xs">
                  {nimbusAutoShipOrder.recipient?.name || nimbusAutoShipOrder.shippingAddress?.name || 'Customer'}
                  {(nimbusAutoShipOrder.recipient?.phone || nimbusAutoShipOrder.shippingAddress?.phone) && (
                    <span className="text-gray-500 font-normal ml-1">
                      ({nimbusAutoShipOrder.recipient?.phone || nimbusAutoShipOrder.shippingAddress?.phone})
                    </span>
                  )}
                </p>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  {nimbusAutoShipOrder.recipient?.addressLine1 || nimbusAutoShipOrder.shippingAddress?.addressLine1}
                  {(nimbusAutoShipOrder.recipient?.addressLine2 || nimbusAutoShipOrder.shippingAddress?.addressLine2) && `, ${nimbusAutoShipOrder.recipient?.addressLine2 || nimbusAutoShipOrder.shippingAddress?.addressLine2}`}
                  {`, ${nimbusAutoShipOrder.recipient?.city || nimbusAutoShipOrder.shippingAddress?.city}`}
                  {` - PIN: ${nimbusAutoShipOrder.recipient?.postalCode || nimbusAutoShipOrder.shippingAddress?.postalCode || '560001'}`}
                </p>
              </div>

              {/* Products Breakdown */}
              <div className="space-y-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  Package Contents ({nimbusAutoShipOrder.items?.length || 0} items)
                </span>
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-gray-50/50">
                  {nimbusAutoShipOrder.items?.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-bold text-gray-900">{item.name}</span>
                        {item.sku && <span className="font-mono text-[9px] text-gray-400 block">{item.sku}</span>}
                      </div>
                      <span className="font-semibold text-gray-700 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                        Qty: {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Package Details & Chargeable Weight Review */}
              <div className="space-y-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  Authoritative Package & Weight Metrics
                </span>
                {isLoadingPackageDetails ? (
                  <div className="p-6 text-center text-gray-400 space-y-2 bg-gray-50 rounded-2xl border border-gray-200">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#237A3B]" />
                    <p className="text-[11px]">Calculating real weights & volumetric dimensions...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-2xs">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Actual Weight</span>
                      <span className="text-base font-extrabold text-gray-900 font-mono">
                        {nimbusPackageDetails?.packageWeightKg ?? 1.0} <span className="text-xs font-sans text-gray-500">kg</span>
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-2xs">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Dimensions (L×W×H)</span>
                      <span className="text-xs font-bold text-gray-900 font-mono block truncate" title={nimbusPackageDetails?.dimensionsString || '30 × 20 × 10 cm'}>
                        {nimbusPackageDetails?.dimensionsString || '30 × 20 × 10 cm'}
                      </span>
                    </div>

                    <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 shadow-2xs">
                      <span className="text-[10px] text-[#237A3B] font-bold uppercase block">Chargeable Weight</span>
                      <span className="text-base font-extrabold text-[#237A3B] font-mono">
                        {nimbusPackageDetails?.chargeableWeightKg ?? 1.0} <span className="text-xs font-sans text-emerald-700">kg</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Pickup Hub Details */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex justify-between items-center text-[11px]">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Pickup Origin Hub</span>
                  <span className="font-bold text-gray-900">
                    {nimbusPackageDetails?.pickupHub.hubName || shippingInfo?.pickupLocation || 'Dhanyasree 1'}
                  </span>
                </div>
                <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-600">
                  PIN: {nimbusPackageDetails?.pickupHub.pincode || shippingInfo?.pickupPincode || '560001'}
                </span>
              </div>

              <form onSubmit={handleConfirmAutoNimbusShipment} className="space-y-4 pt-1">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1 text-[11px]">
                    Select NimbusPost Courier Partner
                  </label>
                  <select
                    value={selectedAutoCourier}
                    onChange={(e) => setSelectedAutoCourier(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800 focus:border-[#237A3B]"
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
                    onClick={() => setNimbusAutoShipOrder(null)}
                    disabled={isBookingAutoShipment}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isBookingAutoShipment}
                    className="px-5 py-2.5 bg-[#237A3B] hover:bg-[#1c6330] disabled:bg-gray-300 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-colors"
                  >
                    {isBookingAutoShipment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Dispatching via API...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Confirm & Dispatch via NimbusPost</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}




      {/* Manual Courier Dispatch Modal */}
      {manualShipOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-6 animate-in fade-in zoom-in duration-200">
            <div className="p-5 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-indigo-200 font-bold flex items-center gap-1">
                  <Package className="w-3 h-3" /> Manual Courier Dispatch & Web Tracking
                </span>
                <h3 className="font-bold text-sm sm:text-base">Ship Order #{manualShipOrder.orderNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setManualShipOrder(null)}
                className="text-white/80 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManualShipment} className="p-6 space-y-4 text-xs">
              {/* Recipient Destination Card */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Delivery Destination</span>
                <p className="font-bold text-gray-900">
                  {manualShipOrder.recipient?.name || manualShipOrder.shippingAddress?.name} •{' '}
                  <span className="text-gray-500 font-normal">
                    {manualShipOrder.recipient?.phone || manualShipOrder.shippingAddress?.phone}
                  </span>
                </p>
                <p className="text-gray-600 text-[11px]">
                  {manualShipOrder.recipient?.addressLine1 || manualShipOrder.shippingAddress?.addressLine1},{' '}
                  {manualShipOrder.recipient?.city || manualShipOrder.shippingAddress?.city} - PIN:{' '}
                  {manualShipOrder.recipient?.postalCode || manualShipOrder.shippingAddress?.postalCode}
                </p>
              </div>

              {/* Courier Selection Pills */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">
                  Select Courier Partner / Carrier <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2 max-h-36 overflow-y-auto p-0.5">
                  {POPULAR_COURIERS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => handleSelectCourier(c.name)}
                      className={`p-2 rounded-xl border text-left flex items-center gap-1.5 transition-all text-[11px] font-semibold ${
                        manualCourierName === c.name
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-xs'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{c.icon}</span>
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>

                {manualCourierName === 'Other Courier' && (
                  <input
                    type="text"
                    value={manualCustomCourier}
                    onChange={(e) => setManualCustomCourier(e.target.value)}
                    placeholder="Enter Custom Courier Name (e.g. Navata Road Transport)"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800"
                    required
                  />
                )}
              </div>

              {/* Tracking ID / AWB */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Tracking ID / Consignment / AWB Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualTrackingNumber}
                  onChange={(e) => setManualTrackingNumber(e.target.value)}
                  placeholder="e.g. EP123456789IN or DTDC892348"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-mono uppercase font-bold text-gray-900"
                  required
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  This tracking ID will be immediately published to the web tracking portal for the customer.
                </span>
              </div>

              {/* Tracking Portal URL */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Courier Online Tracking URL <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="url"
                  value={manualTrackingUrl}
                  onChange={(e) => setManualTrackingUrl(e.target.value)}
                  placeholder="https://www.indiapost.gov.in/..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-700 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Dispatch Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={manualDispatchDate}
                    onChange={(e) => setManualDispatchDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Estimated Delivery</label>
                  <input
                    type="text"
                    value={manualEstimatedDelivery}
                    onChange={(e) => setManualEstimatedDelivery(e.target.value)}
                    placeholder="e.g. 3-5 business days"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Dispatch / Packaging Notes</label>
                <input
                  type="text"
                  value={manualShippingNotes}
                  onChange={(e) => setManualShippingNotes(e.target.value)}
                  placeholder="e.g. Dispatched from Bangalore Healthcare Hub"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs"
                />
              </div>

              {/* Live Customer Preview */}
              <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-indigo-800 tracking-wider flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Customer Web Portal Preview
                </span>
                <p className="text-[11px] text-gray-700">
                  Customer will see: <strong>{manualCourierName === 'Other Courier' ? manualCustomCourier || 'Custom Courier' : manualCourierName}</strong> • Tracking ID:{' '}
                  <span className="font-mono font-bold text-indigo-900">{manualTrackingNumber || 'PENDING'}</span>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setManualShipOrder(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingManualShipment}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-colors"
                >
                  {isSavingManualShipment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing to Web...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Save & Publish Tracking to Web</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Shipment Success Confirmation Dialog Modal */}
      {createdManualShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 bg-gradient-to-r from-indigo-700 to-purple-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-200" />
                <h3 className="font-bold text-sm">✓ Manual Shipment Saved</h3>
              </div>
              <button
                type="button"
                onClick={() => setCreatedManualShipment(null)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-200 text-indigo-950 space-y-1">
                <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider block">
                  Published to Web Tracking Portal
                </span>
                <p className="font-medium text-[11px]">
                  Order <strong>#{createdManualShipment.orderNumber}</strong> is marked as <strong>SHIPPED</strong> via{' '}
                  <strong>{createdManualShipment.courierName}</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-500 font-sans">Tracking ID:</span>
                  <span className="font-mono font-bold text-indigo-900 bg-white px-2.5 py-0.5 rounded border border-gray-200">
                    {createdManualShipment.trackingNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-500 font-sans">Carrier:</span>
                  <span className="font-bold text-gray-800">{createdManualShipment.courierName}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">
                  Quick Customer Communication:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(createdManualShipment.webTrackUrl, 'Customer web tracking link copied!')
                  }
                  className="w-full py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Copy className="w-4 h-4 text-gray-600" />
                  <span>Copy Customer Web Tracking Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => shareViaWhatsApp(createdManualShipment)}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send Tracking via WhatsApp Web</span>
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCreatedManualShipment(null)}
                  className="px-5 py-2 bg-gray-900 text-white font-bold rounded-xl"
                >
                  Done
                </button>
              </div>
            </div>
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
      {selectedOrder && (() => {
        const isHamperOrder = Boolean(
          (selectedOrder as any).isHamperOrder ??
          selectedOrder.items?.some((itm: any) => isHamperItem(itm))
        );

        // Extract photos, message, videos for hamper keepsake
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

        const rawWaMedia = selectedOrder.whatsappMedia || (selectedOrder.shippingAddress as any)?.whatsappMedia || [];
        const whatsappVideos = Array.isArray(rawWaMedia) ? rawWaMedia.filter((m: any) => m.mediaType === 'VIDEO') : [];
        const finalMessage = itemMessage || selectedOrder.personalizationNote || (selectedOrder.shippingAddress as any)?.personalizationNote;

        // Group items for checklist
        const checklistGroups = getPackingChecklistItems(selectedOrder);
        const allChecklistItems = Object.values(checklistGroups).flat();
        const totalItemsToPack = allChecklistItems.length;
        const packedCount = allChecklistItems.filter((i) => packingState[i.id]).length;
        const progressPercent = totalItemsToPack > 0 ? Math.round((packedCount / totalItemsToPack) * 100) : 0;
        const isAllPacked = totalItemsToPack > 0 && packedCount === totalItemsToPack;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-6 max-h-[92vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-[#237A3B] to-[#1c6330] text-white flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                    <ClipboardCheck className="w-5 h-5 text-[#8BCF9B]" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#8BCF9B] font-bold">
                      Order Fulfillment & Packing Hub
                    </span>
                    <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                      Order #{selectedOrder.orderNumber}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs flex-1 bg-gray-50/40">
                {/* Section A: Order Summary Bar */}
                <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900 text-sm">#{selectedOrder.orderNumber}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500 text-[11px] font-medium">
                        {new Date(selectedOrder.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {isHamperOrder ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">
                        <Gift className="w-3.5 h-3.5" />
                        <span>Hamper Gifting Order</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                        <Package className="w-3.5 h-3.5" />
                        <span>Standard E-Commerce Order</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Payment Status</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          selectedOrder.paymentStatus === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : selectedOrder.paymentStatus === 'FAILED'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {selectedOrder.paymentStatus}
                        </span>
                        <span className="text-gray-500 text-[10px] font-semibold">
                          ({selectedOrder.paymentProvider || 'RAZORPAY'})
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Order Status</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block mt-0.5 ${
                        selectedOrder.orderStatus === 'SHIPPED' || selectedOrder.orderStatus === 'DELIVERED'
                          ? 'bg-[#F1FAF3] text-[#237A3B] border-[#8BCF9B]/40'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {selectedOrder.orderStatus}
                      </span>
                    </div>

                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Amount</span>
                      <span className="font-extrabold text-gray-900 text-sm block mt-0.5">
                        {selectedOrder.currency} {selectedOrder.total.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Shipping Method / AWB</span>
                      <div className="mt-0.5">
                        <span className="font-bold text-gray-800 block text-[11px] truncate">
                          {selectedOrder.courierName || selectedOrder.shipment?.courierName || (selectedOrder.shippingMethod === 'MANUAL' ? 'Direct Courier' : 'NimbusPost')}
                        </span>
                        <span className="font-mono text-[10px] text-gray-500 block truncate" title={selectedOrder.shipment?.awbNumber || selectedOrder.trackingNumber || 'Unbooked'}>
                          {selectedOrder.shipment?.awbNumber || selectedOrder.trackingNumber || 'Pending AWB'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section B: Razorpay Live Gateway Transaction Information */}
                <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#237A3B] flex items-center justify-center font-bold">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-gray-900 text-xs uppercase tracking-wide">
                          Razorpay Payment Information
                        </h4>
                        <span className="text-[10px] text-gray-400">
                          Gateway Verification & Transaction Audit
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        selectedOrder.paymentStatus === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : selectedOrder.paymentStatus === 'FAILED'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {selectedOrder.paymentStatus === 'PAID'
                        ? '✓ Razorpay Verified'
                        : selectedOrder.paymentStatus === 'FAILED'
                        ? 'Payment Failed'
                        : 'Awaiting Payment'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Razorpay Payment ID</span>
                      <span
                        className="font-mono font-bold text-gray-900 text-xs block select-all truncate mt-0.5"
                        title={selectedOrder.transactionId || selectedOrder.paymentId || selectedOrder.payments?.[0]?.providerPaymentId || 'N/A'}
                      >
                        {selectedOrder.transactionId || selectedOrder.paymentId || selectedOrder.payments?.[0]?.providerPaymentId || 'Not Captured Yet'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Razorpay Order ID</span>
                      <span
                        className="font-mono font-bold text-gray-900 text-xs block select-all truncate mt-0.5"
                        title={selectedOrder.payments?.[0]?.providerOrderId || 'N/A'}
                      >
                        {selectedOrder.payments?.[0]?.providerOrderId || 'Awaiting Session'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Payment Method</span>
                      <span className="font-bold text-gray-800 text-xs block mt-0.5 uppercase">
                        {(selectedOrder.payments?.[0]?.rawResponse as any)?.method || (selectedOrder.paymentStatus === 'PAID' ? 'Razorpay Standard' : 'Pending Selection')}
                      </span>
                    </div>

                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Captured Amount</span>
                      <span className="font-extrabold text-[#237A3B] text-xs block mt-0.5">
                        {selectedOrder.currency} {selectedOrder.total.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Payment Timestamp</span>
                      <span className="font-medium text-gray-700 text-xs block mt-0.5">
                        {selectedOrder.payments?.[0]?.createdAt
                          ? new Date(selectedOrder.payments[0].createdAt).toLocaleString()
                          : new Date(selectedOrder.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">HMAC Signature</span>
                      <span className="font-bold text-xs block mt-0.5">
                        {selectedOrder.payments?.[0]?.signatureVerified || selectedOrder.paymentStatus === 'PAID' ? (
                          <span className="text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Cryptographically Verified
                          </span>
                        ) : (
                          <span className="text-amber-700">Awaiting Signature</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {selectedOrder.paymentStatus === 'FAILED' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" /> Payment Failure Details
                      </div>
                      <p className="text-[11px] text-red-700">
                        {(selectedOrder.payments?.[0]?.rawResponse as any)?.error_description ||
                          (selectedOrder.payments?.[0]?.rawResponse as any)?.error?.description ||
                          (selectedOrder.payments?.[0]?.rawResponse as any)?.error_code ||
                          'Transaction declined or cancelled by customer at payment gateway.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Section D: Packing Checklist */}
                <div className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#237A3B] flex items-center justify-center">
                        <ClipboardList className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-gray-900 text-xs sm:text-sm uppercase tracking-wide">
                          Packing Checklist & Item Verification
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Check off items as you pack them. Status saves automatically in real-time.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                        isAllPacked
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {isAllPacked ? <Check className="w-3 h-3 text-emerald-600" /> : <Package className="w-3 h-3 text-amber-600" />}
                        <span>
                          {packedCount} of {totalItemsToPack} items packed ({progressPercent}%)
                        </span>
                      </span>

                      {packedCount > 0 && (
                        <button
                          type="button"
                          onClick={handleResetPackingChecklist}
                          className="px-2.5 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-[10px] transition-colors flex items-center gap-1"
                          title="Reset all checkboxes back to unchecked"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isAllPacked ? 'bg-emerald-600' : 'bg-[#237A3B]'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Checklist Groups */}
                  <div className="space-y-4">
                    {Object.entries(checklistGroups).map(([groupTitle, items]) => (
                      <div key={groupTitle} className="p-3.5 bg-gray-50/70 rounded-2xl border border-gray-200/80 space-y-2">
                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/50">
                          <span className="font-extrabold text-gray-900 text-xs flex items-center gap-1.5">
                            {groupTitle.includes('Hamper') ? (
                              <Gift className="w-3.5 h-3.5 text-purple-600" />
                            ) : (
                              <Package className="w-3.5 h-3.5 text-slate-600" />
                            )}
                            <span>{groupTitle}</span>
                          </span>
                          <span className="text-[10px] text-gray-500 font-semibold">
                            {items.filter((i) => packingState[i.id]).length} / {items.length} packed
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {items.map((item) => {
                            const isPacked = Boolean(packingState[item.id]);
                            return (
                              <label
                                key={item.id}
                                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                  isPacked
                                    ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs'
                                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isPacked}
                                  onChange={() => handleTogglePackingItem(item.id)}
                                  className="mt-0.5 h-4 w-4 rounded-md border-gray-300 text-[#237A3B] focus:ring-[#237A3B] cursor-pointer"
                                />

                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-9 h-9 rounded-lg object-cover border border-gray-200 shrink-0"
                                  />
                                ) : (
                                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                    item.isBox ? 'bg-amber-100 text-amber-800' : item.isMessage ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {item.isBox ? <Package className="w-4 h-4" /> : item.isMessage ? <Heart className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                                  </div>
                                )}

                                <div className="space-y-0.5 flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className={`font-bold text-xs truncate ${isPacked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                      {item.name}
                                    </span>
                                    <span className="font-extrabold text-[#237A3B] shrink-0 text-[11px] font-mono">
                                      × {item.quantity}
                                    </span>
                                  </div>
                                  {item.variant && (
                                    <span className="text-[10px] text-gray-500 block truncate">
                                      {item.variant}
                                    </span>
                                  )}
                                  {item.sku && (
                                    <span className="font-mono text-[9px] text-gray-400 block truncate">
                                      SKU: {item.sku}
                                    </span>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section B & C: Complete Ordered Products & Hamper Configuration Breakdown */}
                <div className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                  <div className="pb-2 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-gray-900 text-xs sm:text-sm uppercase tracking-wide">
                        Ordered Products & Specifications
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Itemized product details with visual thumbnails, SKU, variant, and quantities.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-bold text-[10px]">
                      {selectedOrder.items?.length || 0} Total Line Items
                    </span>
                  </div>

                  <div className="space-y-4">
                    {selectedOrder.items?.map((itm: any, itmIdx: number) => {
                      const isHamper = isHamperItem(itm);
                      const snap: any = itm.snapshot || {};
                      const breakdown: any[] = snap.breakdown || [];
                      const box = snap.box;
                      const itmImg = itm.image || snap.image || snap.images?.[0] || itm.product?.images?.[0];
                      const itmSku = itm.sku || snap.sku || itm.product?.sku;
                      const itmVariant = itm.variant || snap.variant || snap.unit || itm.product?.unit || 'Standard';

                      if (isHamper) {
                        return (
                          <div key={itm.id || itmIdx} className="p-4 rounded-2xl border-2 border-purple-200/80 bg-purple-50/20 space-y-4">
                            {/* Hamper Header Card */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-100">
                              <div className="flex items-start gap-3">
                                {itmImg ? (
                                  <img
                                    src={itmImg}
                                    alt={itm.name}
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-purple-200 shadow-xs shrink-0 bg-white"
                                  />
                                ) : (
                                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                                    <Gift className="w-8 h-8" />
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h5 className="font-extrabold text-gray-900 text-sm sm:text-base">
                                      {itm.name}
                                    </h5>
                                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[9px] font-bold border border-purple-300">
                                      🎁 Hamper Product
                                    </span>
                                  </div>
                                  <p className="text-gray-500 text-[11px] mt-0.5">
                                    Quantity: <strong className="text-gray-900">{itm.quantity}</strong> • Unit Price: <strong className="text-gray-900">{selectedOrder.currency} {itm.unitPrice}</strong>
                                  </p>
                                  {itmSku && (
                                    <p className="font-mono text-gray-400 text-[10px]">SKU: {itmSku}</p>
                                  )}
                                </div>
                              </div>

                              <div className="sm:text-right shrink-0">
                                <span className="text-[10px] text-gray-400 font-bold uppercase block">Line Total</span>
                                <span className="font-extrabold text-gray-900 text-base text-[#237A3B]">
                                  {selectedOrder.currency} {itm.totalPrice}
                                </span>
                              </div>
                            </div>

                            {/* Selected Hamper Box Details */}
                            {box && (
                              <div className="p-3.5 bg-white rounded-xl border border-purple-200 shadow-2xs space-y-1.5">
                                <span className="text-[10px] uppercase font-bold text-purple-800 tracking-wider flex items-center gap-1.5">
                                  <Package className="w-3.5 h-3.5 text-purple-600" />
                                  <span>Selected Hamper Gift Box</span>
                                </span>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 pt-0.5">
                                  <div className="space-y-0.5">
                                    <p className="font-extrabold text-gray-900 text-xs">
                                      {box.name}
                                    </p>
                                    <p className="text-gray-600 text-[11px]">
                                      Box Size: <strong className="text-gray-800">{box.size || 'Medium'}</strong> • Box Color: <strong className="text-gray-800">{box.color || 'Pure White'}</strong>
                                      {box.material && <> • Material: <span className="text-gray-600">{box.material}</span></>}
                                    </p>
                                  </div>
                                  <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 text-[10px] font-mono font-bold border border-purple-200 w-fit">
                                    Packing Qty: {itm.quantity} Box{itm.quantity > 1 ? 'es' : ''}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Hamper Constituent Items Table */}
                            <div className="space-y-2">
                              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                                Individual Products Packed Inside This Box ({breakdown.length} items):
                              </span>

                              {breakdown.length === 0 ? (
                                <p className="text-gray-400 italic text-[11px] p-3 bg-white rounded-xl border border-gray-100">
                                  Individual hamper constituents included per catalog definition.
                                </p>
                              ) : (
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 text-[10px] uppercase tracking-wider">
                                        <tr>
                                          <th className="p-2.5">Item</th>
                                          <th className="p-2.5">Variant / Size</th>
                                          <th className="p-2.5">SKU</th>
                                          <th className="p-2.5 text-center">Qty Inside Box</th>
                                          <th className="p-2.5 text-right">Unit Price</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 text-gray-700">
                                        {breakdown.map((b: any, bIdx: number) => {
                                          const bImg = b.image || b.images?.[0];
                                          const bVar = b.variant || b.unit || 'Standard';
                                          return (
                                            <tr key={bIdx} className="hover:bg-gray-50/50">
                                              <td className="p-2.5">
                                                <div className="flex items-center gap-2.5">
                                                  {bImg ? (
                                                    <img
                                                      src={bImg}
                                                      alt={b.name}
                                                      className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0 bg-white"
                                                    />
                                                  ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                                                      <Package className="w-4 h-4" />
                                                    </div>
                                                  )}
                                                  <span className="font-bold text-gray-900 leading-tight">
                                                    {b.name}
                                                  </span>
                                                </div>
                                              </td>
                                              <td className="p-2.5 text-gray-600 font-medium">
                                                {bVar}
                                              </td>
                                              <td className="p-2.5 font-mono text-[10px] text-gray-400">
                                                {b.sku || '—'}
                                              </td>
                                              <td className="p-2.5 text-center">
                                                <span className="font-extrabold text-[#237A3B] font-mono text-xs bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-block">
                                                  {b.quantity || 1}
                                                </span>
                                              </td>
                                              <td className="p-2.5 text-right font-semibold text-gray-800">
                                                {b.unitPrice ? `${selectedOrder.currency} ${b.unitPrice}` : 'Included'}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Normal Product Card
                      return (
                        <div
                          key={itm.id || itmIdx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs gap-4"
                        >
                          <div className="flex items-start gap-3.5">
                            {itmImg ? (
                              <img
                                src={itmImg}
                                alt={itm.name}
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-gray-200 shadow-xs shrink-0 bg-white"
                              />
                            ) : (
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                                <Package className="w-8 h-8" />
                              </div>
                            )}

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="font-extrabold text-gray-900 text-sm sm:text-base">
                                  {itm.name}
                                </h5>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-bold border border-slate-200">
                                  Normal Product
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-gray-600 flex-wrap">
                                <span>Variant: <strong className="text-gray-900">{itmVariant}</strong></span>
                                {itmSku && <span>• SKU: <strong className="font-mono text-gray-700">{itmSku}</strong></span>}
                              </div>

                              <div className="text-[11px] text-gray-500">
                                Qty: <strong className="text-[#237A3B] font-mono text-xs">{itm.quantity}</strong> • Unit Price: {selectedOrder.currency} {itm.unitPrice}
                              </div>
                            </div>
                          </div>

                          <div className="sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                            <span className="text-[10px] text-gray-400 font-bold uppercase block">Line Total</span>
                            <span className="font-extrabold text-gray-900 text-sm sm:text-base">
                              {selectedOrder.currency} {itm.totalPrice}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section E: Customer Customization Details (Hamper Orders Only) */}
                {isHamperOrder && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#F1FAF3] to-emerald-50/60 border-2 border-[#8BCF9B] space-y-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-[#8BCF9B]/40 gap-2">
                      <div className="flex items-center gap-2 text-[#237A3B]">
                        <Heart className="w-4 h-4 fill-current" />
                        <h4 className="font-extrabold text-sm uppercase tracking-wide">
                          Hamper Keepsake & Customization
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedOrder.whatsappStatus && (selectedOrder.whatsappStatus as string) !== 'NOT_APPLICABLE' && selectedOrder.whatsappStatus !== 'NOT_SENT' && (
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
                            selectedOrder.whatsappStatus === 'SENT'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                            <span>WhatsApp Status: {selectedOrder.whatsappStatus}</span>
                          </span>
                        )}
                        <span className="px-2.5 py-1 rounded-full bg-[#237A3B] text-white text-[10px] font-bold">
                          🎁 Hamper Gifting
                        </span>
                      </div>
                    </div>

                    {/* Personal Greeting Card Message */}
                    {finalMessage && (
                      <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#237A3B] uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Personal Greeting Message (To be printed on greeting card):</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handlePrintGreetingCard(selectedOrder.orderNumber, selectedOrder.recipient?.name || selectedOrder.shippingAddress?.name || 'Loved One', finalMessage)}
                            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#237A3B] font-bold rounded-lg border border-emerald-200 flex items-center gap-1 transition-colors text-[10px] cursor-pointer"
                            title="Print physical greeting card"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Print Greeting Card</span>
                          </button>
                        </div>
                        <div className="p-3.5 bg-emerald-50/30 rounded-xl border border-emerald-100 text-gray-800 font-serif italic text-xs sm:text-sm leading-relaxed shadow-2xs">
                          "{finalMessage}"
                        </div>
                      </div>
                    )}

                    {/* Customer Photos */}
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

                    {/* Customer Videos */}
                    {whatsappVideos.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-emerald-200">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                          Customer Uploaded Keepsake Videos ({whatsappVideos.length} videos):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {whatsappVideos.map((vid: any, vIdx: number) => (
                            <div
                              key={vIdx}
                              className="p-3 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-2"
                            >
                              <video
                                src={vid.url}
                                controls
                                className="w-full max-h-48 rounded-xl bg-black"
                              />
                              <div className="flex items-center justify-between text-[11px] text-gray-600">
                                <span className="font-semibold truncate max-w-[150px]">
                                  {vid.originalName || `Video #${vIdx + 1}`}
                                </span>
                                <a
                                  href={vid.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="text-[#237A3B] font-bold hover:underline"
                                >
                                  Download
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Customer Details & Delivery Destination Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Customer / Buyer Details */}
                  <div className="p-3.5 bg-white rounded-2xl border border-gray-200 space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                      {isHamperOrder ? 'Buyer / Overseas Sender' : 'Customer Details'}
                    </span>
                    <p className="font-bold text-gray-900 text-sm">
                      {selectedOrder.buyer?.name || selectedOrder.guestName || 'Customer'}
                    </p>
                    <p className="text-gray-600 font-medium">
                      {selectedOrder.buyer?.email || selectedOrder.guestEmail || 'No email provided'}
                    </p>
                    <p className="font-mono text-gray-900 font-bold">
                      Phone: {selectedOrder.buyer?.phone || selectedOrder.guestPhone || 'Not provided'}
                    </p>
                    {isHamperOrder && (
                      <span className="inline-block text-[10px] font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 mt-1">
                        Sender Country: {selectedOrder.buyer?.country || selectedOrder.buyerCountry || selectedOrder.country || 'US'}
                      </span>
                    )}
                  </div>

                  {/* Delivery Address */}
                  <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-1">
                    <span className="text-[10px] text-[#237A3B] font-bold uppercase tracking-wider block">
                      {isHamperOrder ? 'Recipient (India Delivery)' : 'Shipping / Delivery Address'}
                    </span>
                    <p className="font-bold text-gray-900 text-sm">
                      {selectedOrder.recipient?.name || selectedOrder.shippingAddress?.name || 'Customer'}
                    </p>
                    <p className="font-mono text-emerald-900 font-bold">
                      Phone: {selectedOrder.recipient?.phone || selectedOrder.shippingAddress?.phone || 'No phone'}
                    </p>
                    <p className="text-gray-600 text-[11px] leading-relaxed">
                      {[
                        selectedOrder.recipient?.addressLine1 || selectedOrder.shippingAddress?.addressLine1,
                        selectedOrder.recipient?.addressLine2 || selectedOrder.shippingAddress?.addressLine2,
                        selectedOrder.recipient?.city || selectedOrder.shippingAddress?.city,
                        selectedOrder.recipient?.state || selectedOrder.shippingAddress?.state,
                        selectedOrder.recipient?.postalCode || selectedOrder.shippingAddress?.postalCode,
                      ].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>

                {/* Fulfillment Status & Tracking Form */}
                <form onSubmit={handleUpdateStatus} className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                  <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                    Update Order Fulfillment Status
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-mono font-bold text-gray-900"
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
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="px-5 py-2 bg-[#237A3B] text-white font-bold rounded-xl shadow-md hover:bg-[#1c6330] transition-colors"
                    >
                      {isUpdating ? 'Updating...' : 'Update Order Status'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      })()}

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
