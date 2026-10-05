export interface ConsigneeAddress {
  name: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface PackageDimensions {
  length: number; // in cm
  breadth: number; // in cm
  height: number; // in cm
}

export interface ShipmentItemPayload {
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  weightKg?: number;
}

export interface CreateShipmentParams {
  orderId: string;
  orderNumber: string;
  orderAmount: number;
  shippingCharges?: number;
  discount?: number;
  paymentType: 'prepaid' | 'cod';
  weightKg: number;
  dimensions?: PackageDimensions;
  courierId?: number;
  courierName?: string;
  pickupLocation?: string;
  pickupPincode?: string;
  deliveryAddress: ConsigneeAddress;
  items: ShipmentItemPayload[];
}

export interface ShipmentResult {
  id?: string;
  orderId: string;
  provider: string;
  providerOrderId?: string;
  awbNumber: string;
  courierName: string;
  courierId?: number;
  labelUrl?: string;
  manifestUrl?: string;
  trackingUrl?: string;
  shipmentStatus: string;
  status: string; // for backward compatibility
  estimatedDelivery?: string;
  estimatedDeliveryDate?: string; // for backward compatibility
  pickupPincode?: string;
  deliveryPincode?: string;
  weightKg: number;
  dimensions?: PackageDimensions;
  rawResponse?: any;
  isTestMode: boolean;
}

export interface ServiceabilityParams {
  originPincode?: string;
  destinationPincode: string;
  weightKg?: number;
  paymentType?: 'prepaid' | 'cod';
}

export interface CourierRateOption {
  courierId: number;
  courierName: string;
  minWeight: number;
  rate: number;
  estimatedDays: string;
  expectedDeliveryDate: string;
  rating: number;
  isRecommended?: boolean;
}

export interface ServiceabilityResult {
  serviceable: boolean;
  pincode: string;
  city: string;
  state: string;
  couriers: CourierRateOption[];
  message?: string;
  isTestMode?: boolean;
}

export interface TrackingCheckpoint {
  timestamp: string;
  location: string;
  status: string;
  activity: string;
}

export interface TrackingResult {
  awbNumber: string;
  orderNumber?: string;
  courierName: string;
  status: string;
  currentLocation?: string;
  estimatedDelivery?: string;
  pickupDate?: string;
  deliveredDate?: string;
  recipientName?: string;
  history: TrackingCheckpoint[];
  isTestMode?: boolean;
}

export interface CancelShipmentResult {
  success: boolean;
  message: string;
  rawResponse?: any;
}

export interface ShippingProvider {
  name: string;
  isTestMode: boolean;
  createShipment(params: CreateShipmentParams): Promise<ShipmentResult>;
  checkServiceability(params: ServiceabilityParams): Promise<ServiceabilityResult>;
  trackShipment(awb: string): Promise<TrackingResult | null>;
  cancelShipment(awb: string): Promise<CancelShipmentResult>;
  generateLabel?(awb: string): Promise<{ labelUrl: string }>;
}
