import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function generateOrderNumber(): string {
  // Generates a 5-digit number between 10000 and 99999
  const random = Math.floor(10000 + Math.random() * 90000);
  return random.toString();
}

export function getWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

export function formatOrderForWhatsApp(order: {
  order_number: string;
  customer_name: string;
  customer_phone: string;
  items: { product_name: string; quantity: number; subtotal: number }[];
  total_amount: number;
}): string {
  const itemsList = order.items
    .map((item) => `• ${item.product_name} x${item.quantity} — ${formatPrice(item.subtotal)}`)
    .join('\n');

  return `👋 *Hello Flavour House!*
I would like to confirm my order and make the payment.

━━━━━━━━━━━━━━━━━━━━
📋 *ORDER SUMMARY*
*Order ID:* #${order.order_number}
*Name:* ${order.customer_name}
*Phone:* ${order.customer_phone}
━━━━━━━━━━━━━━━━━━━━

🛒 *ITEMS ORDERED:*
${itemsList}

💰 *TOTAL PAYABLE: ${formatPrice(order.total_amount)}*

💳 *PAYMENT ACTION:*
Please confirm my order so I can make the payment. I am ready to pay via UPI!`;
}

export function getStatusStep(status: string): number {
  const steps: Record<string, number> = {
    pending_payment: 0,
    payment_verified: 1,
    preparing: 2,
    ready: 3,
    out_for_delivery: 4,
    delivered: 5,
    cancelled: -1,
  };
  return steps[status] ?? 0;
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
