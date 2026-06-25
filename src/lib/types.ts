// ===== Database Types =====

export interface Profile {
  id: string;
  full_name: string | null;
  mobile_number: string | null;
  role: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_veg: boolean;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export type OrderStatus =
  | 'pending_payment'
  | 'awaiting_payment'
  | 'payment_verified'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'cancellation_requested';

export interface Order {
  id: string;
  user_id?: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string;
  order_notes: string | null;
  status: OrderStatus;
  total_amount: number;
  rating?: number;
  review_comment?: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  driver_id?: string | null;
  driver_name?: string | null;
  driver_mobile_number?: string | null;
  driver_vehicle_number?: string | null;
  driver_photo_url?: string | null;
  driver_assigned_at?: string | null;
}

export interface Driver {
  id: string;
  name: string;
  mobile_number: string;
  vehicle_number: string;
  photo_url: string;
  availability_status: 'Available' | 'Assigned';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  image_url: string;
  quantity: number;
  subtotal: number;
}

export interface RestaurantSettings {
  id: string;
  business_name: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  address: string;
  opening_time: string;
  closing_time: string;
  kitchen_open: boolean;
  reservations_open: boolean;
  upi_id: string;
  bank_details: string;
  updated_at: string;
}

// ===== Cart Types =====

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  is_veg: boolean;
}

// ===== Form Types =====

export interface CheckoutFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category_id: string;
  is_veg: boolean;
  is_available: boolean;
  image_url: string;
}

// ===== Status Helpers =====

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Pending Payment',
  awaiting_payment: 'Awaiting Payment',
  payment_verified: 'Payment Verified',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  cancellation_requested: 'Cancel Requested',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: 'status-pending',
  awaiting_payment: 'bg-yellow-100 text-yellow-800',
  payment_verified: 'status-verified',
  preparing: 'status-preparing',
  ready: 'status-ready',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  cancellation_requested: 'bg-red-500 text-white animate-pulse',
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending_payment',
  'awaiting_payment',
  'payment_verified',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
];

export interface RestaurantTable {
  id: string;
  table_number: string;
  table_name: string | null;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ReservationStatus = 'reserved' | 'confirmed' | 'completed' | 'cancelled';

export interface TableReservation {
  id: string;
  reservation_number: string;
  customer_name: string;
  phone_number: string;
  email: string | null;
  table_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  number_of_guests: number;
  special_request: string | null;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
  restaurant_tables?: RestaurantTable;
}
