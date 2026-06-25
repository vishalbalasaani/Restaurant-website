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

export function formatReservationForWhatsApp(reservation: {
  reservation_number: string;
  customer_name: string;
  reservation_date: string;
  start_time: string;
  number_of_guests: number;
  table_name: string | null;
}): string {
  const formattedDate = new Date(reservation.reservation_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  
  // Format start_time which is HH:MM:SS
  const [hours, minutes] = reservation.start_time.split(':');
  const d = new Date();
  d.setHours(parseInt(hours), parseInt(minutes));
  const formattedTime = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);

  return `👋 Hello ${reservation.customer_name}!
Your table reservation at Flavour House is Confirmed! 🎉

📝 RESERVATION DETAILS
*ID:* #${reservation.reservation_number}
*Date:* ${formattedDate}
*Time:* ${formattedTime}
*Table:* ${reservation.table_name || 'Assigned Table'}
*Guests:* ${reservation.number_of_guests} People

We look forward to welcoming you!`;
}

export function getStatusStep(status: string): number {
  const steps: Record<string, number> = {
    pending_payment: 0,
    awaiting_payment: 1,
    payment_verified: 2,
    preparing: 3,
    ready: 4,
    out_for_delivery: 5,
    delivered: 6,
    cancelled: -1,
  };
  return steps[status] ?? -1;
}

export function playBuzzer() {
  try {
     
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    // Play 3 short distinct "ding" alerts
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime + i * 0.25); // A5 note
      
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.25);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + i * 0.25 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.25 + 0.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + i * 0.25);
      osc.stop(ctx.currentTime + i * 0.25 + 0.2);
    }
  } catch {
    // Ignore if AudioContext is blocked by browser interaction policies
  }
}

export function playReservationBuzzer() {
  try {
     
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    // Play 2 distinct "chimes" for reservation (different from order buzzer)
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime + i * 0.4); // C5 note
      
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.4);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + i * 0.4 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.4 + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + i * 0.4);
      osc.stop(ctx.currentTime + i * 0.4 + 0.35);
    }
  } catch {
    // Ignore if AudioContext is blocked by browser interaction policies
  }
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
  if (!timeString) return '';
  let date: Date;
  if (timeString.includes('T')) {
    date = new Date(timeString);
  } else {
    const [hours, minutes] = timeString.split(':');
    date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
  }
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
