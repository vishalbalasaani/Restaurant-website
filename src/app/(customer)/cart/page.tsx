'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag, Send, XCircle } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart-store';
import { formatPrice, generateOrderNumber, getWhatsAppLink, formatOrderForWhatsApp, getEffectiveRestaurantStatus } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { CheckoutFormData, RestaurantSettings } from '@/lib/types';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, getTotalAmount, clearCart } = useCartStore();
  const total = getTotalAmount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [globalSettings, setGlobalSettings] = useState<RestaurantSettings | null>(null);
  const [formData, setFormData] = useState<CheckoutFormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<CheckoutFormData>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('restaurant_settings').select('*').single();
      if (data) setGlobalSettings(data as RestaurantSettings);
    };
    fetchSettings();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (formErrors[name as keyof CheckoutFormData]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const errors: Partial<CheckoutFormData> = {};
    if (!formData.name.trim()) errors.name = 'Full Name is required';
    
    if (!formData.phone.trim()) {
      errors.phone = 'Phone Number is required';
    } else if (formData.phone.replace(/\D/g, '').length < 10) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (!formData.address.trim()) errors.address = 'Delivery Address is required';
    
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    const ordNum = generateOrderNumber();
    setOrderNumber(ordNum);

    try {
      const supabase = createClient();

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: ordNum,
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_email: formData.email || null,
          customer_address: formData.address,
          order_notes: formData.notes || null,
          status: 'pending_payment',
          total_amount: total,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Store in local storage to auto-load in track page
      const stored = localStorage.getItem('recentOrders');
      const recentOrders = stored ? JSON.parse(stored) : [];
      if (!recentOrders.includes(ordNum)) {
        recentOrders.push(ordNum);
        localStorage.setItem('recentOrders', JSON.stringify(recentOrders));
      }

      // Verify product IDs exist to avoid foreign key violations for deleted products
      const productIds = items.map(i => i.product_id);
      const { data: validProducts } = await supabase.from('products').select('id').in('id', productIds);
      const validIds = new Set((validProducts || []).map(p => p.id));

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: validIds.has(item.product_id) ? item.product_id : null,
        product_name: item.name,
        product_price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      
      if (itemsError) {
        console.error('Failed to insert order items:', itemsError);
      }

      // Send to WhatsApp
      const whatsappMessage = formatOrderForWhatsApp({
        order_number: ordNum,
        customer_name: formData.name,
        customer_phone: formData.phone,
        items: orderItems,
        total_amount: total,
      });

      const whatsappNumber = globalSettings?.whatsapp || '919876543210';
      const waLink = getWhatsAppLink(whatsappNumber, whatsappMessage);
      window.open(waLink, '_blank');

      clearCart();
      router.push(`/track?order=${ordNum}`);
    } catch {
      clearCart();
      router.push(`/track?order=${ordNum}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Order Confirmation Screen
  if (orderPlaced) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center card-shadow"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
            <Send className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="mb-2 font-heading text-2xl font-bold text-primary">
            Order Placed!
          </h2>
          <p className="mb-6 font-body text-text-light">
            Your order has been sent to the restaurant.
            <br />
            You&apos;ll receive payment details shortly.
          </p>
          <div className="mb-6 rounded-xl bg-background p-4">
            <p className="mb-1 font-body text-xs text-text-muted">Order ID</p>
            <p className="font-heading text-2xl font-bold text-accent">{orderNumber}</p>
          </div>
          <div className="space-y-3">
            <Link
              href={`/track?order=${orderNumber}`}
              className="flex w-full items-center justify-center rounded-xl bg-primary px-6 py-4 font-button text-sm font-semibold text-white transition-colors hover:bg-primary-light"
            >
              Track Your Order
            </Link>
            <Link
              href="/home"
              className="flex w-full items-center justify-center rounded-xl border border-border px-6 py-4 font-button text-sm font-semibold text-text-light transition-colors hover:bg-background"
            >
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const { isOpen } = getEffectiveRestaurantStatus(globalSettings as any);
  if (globalSettings && !isOpen) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <div className="mb-4 rounded-full bg-red-100 p-4">
          <XCircle className="h-10 w-10 text-red-600" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-text mb-2">Kitchen Closed</h2>
        <p className="text-text-light max-w-md mb-6">
          Our kitchen is currently closed. We are not accepting new orders at this time.
        </p>
        <Link href="/menu" className="rounded-xl bg-primary px-6 py-3 font-bold text-white transition-colors hover:bg-primary-light">
          Browse Menu Anyway
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-4 md:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Link href="/menu" className="rounded-lg p-2 text-text-light transition-colors hover:bg-background hover:text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-heading text-3xl font-bold text-primary">Checkout</h1>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ShoppingBag className="mb-4 h-20 w-20 text-border" />
            <h2 className="mb-2 font-heading text-xl font-semibold text-text">
              Your cart is empty
            </h2>
            <p className="mb-6 text-sm text-text-light">Add some delicious items from our menu.</p>
            <Link href="/menu" className="rounded-xl bg-primary px-6 py-3 font-button text-sm font-semibold text-white transition-colors hover:bg-primary-light">
              Browse Menu
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-5">
            {/* Left: Cart Items + Form */}
            <div className="lg:col-span-3 space-y-6">
              {/* Cart Items */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-4 font-heading text-lg font-semibold text-primary">
                  Order Items
                </h3>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.product_id} className="flex gap-4 rounded-xl border border-border-light p-3">
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                        <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="64px" />
                      </div>
                      <div className="flex flex-1 items-center justify-between">
                        <div>
                          <h4 className="font-heading text-sm font-semibold text-text">{item.name}</h4>
                          <p className="text-sm text-accent">{formatPrice(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-light hover:border-accent hover:text-accent">
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                            <button type="button" onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white hover:bg-primary-light">
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="w-16 text-right font-heading text-sm font-bold text-primary">{formatPrice(item.price * item.quantity)}</span>
                          <button type="button" onClick={() => removeItem(item.product_id)} className="rounded-md p-1 text-text-muted hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Details */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-4 font-heading text-lg font-semibold text-primary">
                  Delivery Details
                </h3>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-text">Full Name *</label>
                      <input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange} placeholder="John Doe" className={`w-full rounded-xl border bg-background px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-1 ${formErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-border focus:border-accent focus:ring-accent'}`} />
                      {formErrors.name && <p className="mt-1.5 text-xs font-medium text-red-500">{formErrors.name}</p>}
                    </div>
                    <div>
                      <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-text">Phone Number *</label>
                      <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="+91 98765 43210" className={`w-full rounded-xl border bg-background px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-1 ${formErrors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-border focus:border-accent focus:ring-accent'}`} />
                      {formErrors.phone && <p className="mt-1.5 text-xs font-medium text-red-500">{formErrors.phone}</p>}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text">Email (optional)</label>
                    <input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="you@example.com" className={`w-full rounded-xl border bg-background px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-1 ${formErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-border focus:border-accent focus:ring-accent'}`} />
                    {formErrors.email && <p className="mt-1.5 text-xs font-medium text-red-500">{formErrors.email}</p>}
                  </div>
                  <div>
                    <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-text">Delivery Address *</label>
                    <textarea id="address" name="address" rows={3} value={formData.address} onChange={handleInputChange} placeholder="Full delivery address..." className={`w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-1 ${formErrors.address ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-border focus:border-accent focus:ring-accent'}`} />
                    {formErrors.address && <p className="mt-1.5 text-xs font-medium text-red-500">{formErrors.address}</p>}
                  </div>
                  <div>
                    <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-text">Order Notes (optional)</label>
                    <textarea id="notes" name="notes" rows={2} value={formData.notes} onChange={handleInputChange} placeholder="Any special instructions..." className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-2">
              <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 card-shadow">
                <h3 className="mb-4 font-heading text-lg font-semibold text-primary">
                  Order Summary
                </h3>
                <div className="space-y-3 border-b border-border pb-4">
                  {items.map((item) => (
                    <div key={item.product_id} className="flex justify-between text-sm">
                      <span className="text-text-light">{item.name} × {item.quantity}</span>
                      <span className="font-medium text-text">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-heading text-base font-semibold text-text">Total</span>
                  <span className="font-heading text-2xl font-bold text-primary">{formatPrice(total)}</span>
                </div>
                <p className="mt-2 text-xs text-text-muted">
                  Payment details will be shared after order confirmation.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting || !kitchenOpen}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-4 font-button text-base font-semibold text-primary transition-all duration-300 hover:bg-accent-light hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {!kitchenOpen ? 'Kitchen Closed' : 'Place Order'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
