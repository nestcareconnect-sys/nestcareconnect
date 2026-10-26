import axios from 'axios';

export interface WhatsAppMediaItem {
  id?: string;
  url: string;
  key?: string;
  originalName: string;
  mimeType: string;
  fileSize?: number;
  mediaType: 'IMAGE' | 'VIDEO';
}

export interface WhatsAppOrderPayload {
  orderId?: string;
  orderNumber?: string;
  buyer?: {
    name?: string;
    email?: string;
    phone?: string;
    country?: string;
  };
  recipient?: {
    name?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
  }>;
  subtotal?: number | string;
  shippingFee?: number | string;
  total?: number | string;
  currency?: string;
  notes?: string;
  media?: WhatsAppMediaItem[];
}

export interface SendResult {
  success: boolean;
  mode: 'CLOUD_API' | 'CLICK_TO_CHAT_FALLBACK';
  messageId?: string;
  mediaMessageIds?: string[];
  fallbackUrl?: string;
  error?: string;
  reason?: string;
}

export class WhatsAppService {
  private businessPhoneNumber: string;
  private accessToken?: string;
  private phoneNumberId?: string;
  private graphApiVersion = 'v21.0';

  constructor() {
    this.businessPhoneNumber = this.cleanPhoneNumber(
      process.env.WHATSAPP_BUSINESS_PHONE_NUMBER || '+91 89213 42411'
    );
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || undefined;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || undefined;
  }

  /**
   * Normalize phone number to digits only for WhatsApp (E.164 without leading plus)
   */
  public cleanPhoneNumber(phone?: string): string {
    if (!phone) return '918921342411';
    const digits = phone.replace(/\D/g, '');
    // If entered as 10-digit Indian number without country code, prefix 91
    if (digits.length === 10) {
      return `91${digits}`;
    }
    return digits;
  }

  /**
   * Check if WhatsApp Business Cloud API is fully configured with credentials
   */
  public isCloudApiConfigured(): boolean {
    return Boolean(this.accessToken && this.phoneNumberId);
  }

  /**
   * Get public configuration safely without exposing tokens
   */
  public getPublicConfig() {
    return {
      businessPhoneNumber: this.businessPhoneNumber,
      formattedBusinessPhone: `+${this.businessPhoneNumber}`,
      cloudApiAvailable: this.isCloudApiConfigured(),
    };
  }

  /**
   * Format the order text strictly following business requirements
   */
  public formatOrderMessage(payload: WhatsAppOrderPayload): string {
    const orderId = payload.orderNumber || payload.orderId || 'Pending Checkout';
    const buyer = payload.buyer || {};
    const recipient = payload.recipient || {};
    const items = payload.items || [];

    // Care Package description
    const carePackageSummary =
      items.length > 0
        ? items.map((i) => (i.quantity > 1 ? `${i.name} (x${i.quantity})` : i.name)).join(', ')
        : 'Care Package';

    const totalQuantity = items.length > 0
      ? items.reduce((acc, i) => acc + (i.quantity || 1), 0)
      : 1;

    // Address formatting
    const addressParts = [recipient.addressLine1, recipient.addressLine2].filter(Boolean);
    const fullAddress = addressParts.join(', ') || 'Not Provided';

    // Pricing formatting in INR
    const formatAmount = (val?: number | string) => {
      if (val === undefined || val === null) return '0.00';
      if (typeof val === 'number') return val.toFixed(2);
      return val;
    };

    const subtotalStr = typeof payload.subtotal === 'number'
      ? `₹${formatAmount(payload.subtotal)}`
      : `${payload.subtotal || '₹0.00'}`;

    const shippingStr = payload.shippingFee === 0 || payload.shippingFee === '0' || payload.shippingFee === 'FREE'
      ? 'FREE'
      : (typeof payload.shippingFee === 'number' ? `₹${formatAmount(payload.shippingFee)}` : `${payload.shippingFee || 'FREE'}`);

    const totalStr = typeof payload.total === 'number'
      ? `₹${formatAmount(payload.total)}`
      : `${payload.total || '₹0.00'}`;

    let msg = `CUSTOMER ORDER DETAILS\n\n` +
      `Order ID: ${orderId}\n\n` +
      `BUYER / SENDER INFORMATION\n` +
      `Name: ${buyer.name || 'Not Provided'}\n` +
      `Email: ${buyer.email || 'Not Provided'}\n` +
      `Phone: ${buyer.phone || 'Not Provided'}\n` +
      `Country: ${buyer.country || 'Overseas'}\n\n` +
      `RECIPIENT INFORMATION\n` +
      `Recipient Name: ${recipient.name || 'Not Provided'}\n` +
      `Recipient Phone: ${recipient.phone || 'Not Provided'}\n` +
      `Delivery Address: ${fullAddress}\n` +
      `City: ${recipient.city || 'Not Provided'}\n` +
      `State: ${recipient.state || 'Not Provided'}\n` +
      `PIN Code: ${recipient.postalCode || 'Not Provided'}\n\n` +
      `ORDER INFORMATION\n` +
      `Care Package: ${carePackageSummary}\n` +
      `Quantity: ${totalQuantity}\n` +
      `Subtotal: ${subtotalStr}\n` +
      `Shipping: ${shippingStr}\n` +
      `Total Payable: ${totalStr}\n` +
      `Currency: INR\n\n` +
      `Additional Notes: ${payload.notes?.trim() || 'None'}`;

    // Append media attachments if any
    if (payload.media && payload.media.length > 0) {
      const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
      msg += `\n\nSHARED PHOTOS & VIDEOS (${payload.media.length} files)\n`;
      payload.media.forEach((m, idx) => {
        const fullUrl = m.url.startsWith('http') ? m.url : `${appUrl}${m.url}`;
        const sizeStr = m.fileSize ? ` (${(m.fileSize / (1024 * 1024)).toFixed(1)} MB)` : '';
        msg += `${idx + 1}. [${m.mediaType}] ${m.originalName}${sizeStr}\n   Preview: ${fullUrl}\n`;
      });
      msg += `\nNote: If sending via WhatsApp Web/App, you can also attach these files directly in chat.`;
    }

    return msg;
  }

  /**
   * Generate WhatsApp Click-to-Chat URL
   */
  public getClickToChatUrl(payload: WhatsAppOrderPayload): string {
    const message = this.formatOrderMessage(payload);
    const phone = this.businessPhoneNumber;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  /**
   * Send order details to the business WhatsApp.
   * If WhatsApp Cloud API is configured, invokes Meta Graph API securely.
   * If not configured, gracefully provides the Click-to-Chat fallback.
   */
  public async sendOrderToBusiness(payload: WhatsAppOrderPayload): Promise<SendResult> {
    const formattedText = this.formatOrderMessage(payload);
    const clickToChatUrl = this.getClickToChatUrl(payload);

    if (!this.isCloudApiConfigured()) {
      console.log('[WhatsAppService] WhatsApp Cloud API not configured; providing Click-to-Chat fallback URL.');
      return {
        success: false,
        mode: 'CLICK_TO_CHAT_FALLBACK',
        fallbackUrl: clickToChatUrl,
        reason: 'WhatsApp Business Cloud API credentials not configured in environment.',
      };
    }

    try {
      // 1. Send the primary order details message
      const endpoint = `https://graph.facebook.com/${this.graphApiVersion}/${this.phoneNumberId}/messages`;
      
      const textResponse = await axios.post(
        endpoint,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.businessPhoneNumber,
          type: 'text',
          text: {
            preview_url: true,
            body: formattedText,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const messageId = textResponse.data?.messages?.[0]?.id;
      const mediaMessageIds: string[] = [];

      // 2. If media items exist, send each media message
      if (payload.media && payload.media.length > 0) {
        const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

        for (const item of payload.media) {
          try {
            const fullUrl = item.url.startsWith('http') ? item.url : `${appUrl}${item.url}`;
            const isVideo = item.mediaType === 'VIDEO';

            const mediaPayload: any = {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: this.businessPhoneNumber,
              type: isVideo ? 'video' : 'image',
            };

            if (isVideo) {
              mediaPayload.video = {
                link: fullUrl,
                caption: `Order #${payload.orderNumber || payload.orderId} - Video: ${item.originalName}`,
              };
            } else {
              mediaPayload.image = {
                link: fullUrl,
                caption: `Order #${payload.orderNumber || payload.orderId} - Image: ${item.originalName}`,
              };
            }

            const mediaRes = await axios.post(endpoint, mediaPayload, {
              headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
              },
              timeout: 15000,
            });

            const mId = mediaRes.data?.messages?.[0]?.id;
            if (mId) mediaMessageIds.push(mId);
          } catch (mediaErr: any) {
            console.warn(`[WhatsAppService] Failed to send media item ${item.originalName}:`, mediaErr?.response?.data || mediaErr.message);
          }
        }
      }

      console.log(`[WhatsAppService] Order #${payload.orderNumber || payload.orderId} successfully notified via Cloud API. Message ID: ${messageId}`);

      return {
        success: true,
        mode: 'CLOUD_API',
        messageId,
        mediaMessageIds,
        fallbackUrl: clickToChatUrl,
      };
    } catch (err: any) {
      const errorData = err.response?.data?.error || err.message;
      console.error('[WhatsAppService] WhatsApp Cloud API delivery error:', errorData);

      return {
        success: false,
        mode: 'CLICK_TO_CHAT_FALLBACK',
        error: typeof errorData === 'object' ? JSON.stringify(errorData) : String(errorData),
        fallbackUrl: clickToChatUrl,
        reason: 'Failed to deliver via WhatsApp Cloud API. Customer can proceed via Click-to-Chat.',
      };
    }
  }
}

export const whatsappService = new WhatsAppService();
