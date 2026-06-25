'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Search, Package, CheckCircle2, Clock, Truck, ChefHat, CreditCard, XCircle, Star, MessageCircle, Phone, Flame, Radar, MapPin, Bike } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate, getStatusStep } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/lib/types';
import { useSettings } from '@/lib/hooks/use-settings';
import type { Order, OrderItem } from '@/lib/types';

const STATUS_STEPS = [
  { key: 'pending_payment', label: 'Order Placed', icon: CreditCard, color: 'bg-slate-500', ring: 'ring-slate-100', text: 'text-slate-600' },
  { key: 'awaiting_payment', label: 'Awaiting Verification', icon: MessageCircle, color: 'bg-yellow-500', ring: 'ring-yellow-100', text: 'text-yellow-600' },
  { key: 'payment_verified', label: 'Payment Verified', icon: CheckCircle2, color: 'bg-emerald-500', ring: 'ring-emerald-100', text: 'text-emerald-600' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, color: 'bg-orange-500', ring: 'ring-orange-100', text: 'text-orange-600' },
  { key: 'ready', label: 'Ready', icon: Package, color: 'bg-blue-500', ring: 'ring-blue-100', text: 'text-blue-600' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, color: 'bg-indigo-500', ring: 'ring-indigo-100', text: 'text-indigo-600' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'bg-green-500', ring: 'ring-green-100', text: 'text-green-600' },
];

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const [activeOrders, setActiveOrders] = useState<string[]>([]);
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [review, setReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const { settings } = useSettings();

  // Real-time subscription
  useEffect(() => {
    if (!order) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        (payload) => {
          setOrder((prev) => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  const removeOrderFromStorage = (orderNum: string): string[] => {
    let remainingOrders: string[] = [];
    const storedOrdersRaw = localStorage.getItem('recentOrders');
    if (storedOrdersRaw) {
      try {
        remainingOrders = JSON.parse(storedOrdersRaw).filter((id: string) => id !== orderNum);
        localStorage.setItem('recentOrders', JSON.stringify(remainingOrders));
        setActiveOrders(remainingOrders);
      } catch {}
    }
    if (localStorage.getItem('recentOrderNumber') === orderNum) {
      localStorage.removeItem('recentOrderNumber');
    }
    return remainingOrders;
  };

  // We intentionally keep completed/cancelled orders in localStorage 
  // so the user can switch between them and leave reviews for each order.

  const performSearch = async (queryOrder: string) => {
    if (!queryOrder) return;

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const supabase = createClient();

      const query = supabase.from('orders').select('*').eq('order_number', queryOrder);
      
      const { data, error: fetchError } = await query.single();

      if (fetchError || !data) {
        const storedOrdersRaw = localStorage.getItem('recentOrders');
        if (storedOrdersRaw) {
          try {
            const ordersList = JSON.parse(storedOrdersRaw).filter((id: string) => id !== queryOrder);
            localStorage.setItem('recentOrders', JSON.stringify(ordersList));
            setActiveOrders(ordersList);
          } catch {}
        }
        localStorage.removeItem('recentOrderNumber');
        setOrder(null);
        setOrderItems([]);
        return;
      }

      setOrder(data);

      // Remove cancelled or fully rated orders from active tabs
      if (data.status === 'cancelled' || (data.status === 'delivered' && data.rating)) {
        const remaining = removeOrderFromStorage(data.order_number);
        if (remaining.length > 0) {
          const nextOrder = remaining[remaining.length - 1];
          setOrderNumber(nextOrder);
          window.history.replaceState(null, '', `/track?order=${nextOrder}`);
          performSearch(nextOrder);
        } else {
          window.history.replaceState(null, '', '/track');
          setOrder(null);
          setOrderItems([]);
        }
        return;
      }

      // Fetch order items
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', data.id);

      setOrderItems(items || []);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load order from URL or localStorage on mount
  useEffect(() => {
    const urlOrder = searchParams.get('order');
    const storedOrdersRaw = localStorage.getItem('recentOrders');
    let ordersList: string[] = [];
    
    if (storedOrdersRaw) {
      try {
        ordersList = JSON.parse(storedOrdersRaw);
      } catch {}
    }

    // Legacy fallback
    const legacyOrder = localStorage.getItem('recentOrderNumber');
    if (legacyOrder && !ordersList.includes(legacyOrder)) {
      ordersList.push(legacyOrder);
      localStorage.setItem('recentOrders', JSON.stringify(ordersList));
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveOrders(ordersList);

    if (urlOrder) {
      setOrderNumber(urlOrder);
      performSearch(urlOrder);
    } else if (ordersList.length > 0) {
      const latestOrder = ordersList[ordersList.length - 1];
      setOrderNumber(latestOrder);
      performSearch(latestOrder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStep = order ? getStatusStep(order.status) : -1;
  const isCancelled = order?.status === 'cancelled';
  const canCancel = order?.status === 'pending_payment' || order?.status === 'awaiting_payment' || order?.status === 'payment_verified';

  const handleCancelOrder = async () => {
    if (!order || !confirm('Are you sure you want to request cancellation for this order?')) return;
    try {
      const supabase = createClient();
      await supabase.from('orders').update({ status: 'cancellation_requested' }).eq('id', order.id);
      alert('Cancellation request sent to the restaurant. We will review and process it shortly.');
      // Update local state instantly to reflect request
      setOrder({ ...order, status: 'cancellation_requested' });
    } catch {
      alert('Failed to cancel order');
    }
  };

  const handleSubmitRating = async (skipped = false) => {
    if (skipped) {
      const remaining = removeOrderFromStorage(order!.order_number);
      if (remaining.length > 0) {
        setOrderNumber(remaining[remaining.length - 1]);
        window.history.replaceState(null, '', `/track?order=${remaining[remaining.length - 1]}`);
        performSearch(remaining[remaining.length - 1]);
      } else {
        window.history.replaceState(null, '', '/track');
        setOrder(null);
      }
      return;
    }
    if (!rating) return;
    
    setSubmittingRating(true);
    try {
      const supabase = createClient();
      await supabase
        .from('orders')
        .update({ rating, review_comment: review.trim(), updated_at: new Date().toISOString() })
        .eq('id', order!.id);
        
      setRatingSubmitted(true);
      // Update local state so it immediately shows the thank you message instead of the form if they click the tab again
      setOrder(prev => prev ? { ...prev, rating: rating, review_comment: review.trim() } : null);
      setTimeout(() => {
        const remaining = removeOrderFromStorage(order!.order_number);
        if (remaining.length > 0) {
          setOrderNumber(remaining[remaining.length - 1]);
          window.history.replaceState(null, '', `/track?order=${remaining[remaining.length - 1]}`);
          performSearch(remaining[remaining.length - 1]);
        } else {
          window.history.replaceState(null, '', '/track');
          setOrder(null); // Clear tracker view to go back to search
        }
      }, 2500);
    } catch {
      // Ignore error for user experience
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-2xl px-4 md:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="mb-2 font-heading text-3xl font-bold text-primary md:text-4xl">
            Live Tracker
          </h1>
          {order && (
            <p className="font-body text-text-light">
              Real-time updates for your order
            </p>
          )}
        </motion.div>

        {/* Empty State */}
        {!order && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card p-12 text-center card-shadow">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-accent/20">
              <Package className="h-12 w-12 text-accent" />
            </div>
            <h2 className="mb-2 font-heading text-2xl font-bold text-primary">No Active Orders</h2>
            <p className="mb-8 text-text-light">You don&apos;t have any orders currently in progress. Grab some delicious food!</p>
            <a href="/menu" className="rounded-xl bg-primary px-8 py-3.5 font-button text-sm font-semibold text-white transition-colors hover:bg-primary-light">
              Browse Menu
            </a>
          </motion.div>
        )}

        {/* Active Orders Tabs */}
        {activeOrders.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-3">
            {activeOrders.map(id => (
              <button
                key={id}
                onClick={() => {
                  setOrderNumber(id);
                  performSearch(id);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  order?.order_number === id 
                    ? 'bg-primary text-white shadow-md' 
                    : 'bg-background border border-border text-text-light hover:border-accent hover:text-accent'
                }`}
              >
                Order {id}
              </button>
            ))}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {/* Order Status */}
        {order && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Order Info */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-muted">Order ID</p>
                  <p className="font-heading text-xl font-bold text-accent">{order.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-muted">Placed on</p>
                  <p className="text-sm font-medium text-text">{formatDate(order.created_at)}</p>
                </div>
              </div>

              {/* Cancelled Status */}
              {isCancelled || order.status === 'cancellation_requested' ? (
                <div className="flex flex-col gap-4">
                  {isCancelled && (
                    <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 border border-red-200">
                      <XCircle className="h-6 w-6 text-red-500" />
                      <div>
                        <p className="font-heading text-sm font-semibold text-red-700">Order Cancelled</p>
                        <p className="text-xs text-red-500">This order has been cancelled.</p>
                      </div>
                    </div>
                  )}
                  {order.status === 'cancellation_requested' && (
                    <div className="flex items-center gap-3 rounded-xl bg-orange-50 p-4 border border-orange-200">
                      <XCircle className="h-6 w-6 text-orange-500" />
                      <div>
                        <h4 className="font-heading text-sm font-semibold text-orange-800">Cancellation Pending Approval</h4>
                        <p className="text-xs text-orange-700 mt-1">Your request to cancel this order has been sent to the restaurant.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : order.status === 'delivered' ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  {ratingSubmitted || order.rating ? (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <h3 className="font-heading text-xl font-bold text-primary">Thank You!</h3>
                      <p className="text-sm text-text-light">Your feedback helps us serve you better.</p>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                      <div className="mb-6 flex flex-col items-center">
                        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                          <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <h3 className="font-heading text-2xl font-bold text-primary">Order Delivered!</h3>
                        <p className="text-sm text-text-light mt-1">We hope you enjoy your meal.</p>
                      </div>
                      
                      <div className="rounded-2xl bg-background p-6 border border-border">
                        <h4 className="font-heading font-semibold text-text mb-4">How was the food?</h4>
                        <div className="flex justify-center gap-2 mb-6">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              onMouseEnter={() => setHoveredRating(star)}
                              onMouseLeave={() => setHoveredRating(0)}
                              className="focus:outline-none transition-transform hover:scale-110"
                            >
                              <Star
                                className={`h-8 w-8 transition-colors ${
                                  star <= (hoveredRating || rating)
                                    ? 'fill-amber-400 text-amber-500'
                                    : 'text-slate-300 stroke-2 hover:text-slate-400'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        
                        <textarea
                          value={review}
                          onChange={(e) => setReview(e.target.value)}
                          placeholder="Tell us what you liked (optional)"
                          rows={2}
                          className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent mb-4"
                        />
                        
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleSubmitRating(true)}
                            className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-text-light hover:bg-border-light transition-colors"
                          >
                            Skip
                          </button>
                          <button
                            onClick={() => handleSubmitRating(false)}
                            disabled={!rating || submittingRating}
                            className="flex-1 rounded-xl bg-primary px-4 py-3 font-button text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-50"
                          >
                            {submittingRating ? 'Submitting...' : 'Submit Rating'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* WhatsApp Verification Banner */}
                  {order.status === 'awaiting_payment' && settings?.whatsapp && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-[#25D366]/30 bg-[#25D366]/5 p-5">
                      <div className="flex items-start gap-4">
                        <div className="rounded-full bg-[#25D366]/20 p-2 text-[#25D366]">
                          <MessageCircle className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="font-heading font-bold text-text">Verify your payment</h4>
                          <p className="mt-1 text-sm text-text-light">
                            Your order has been accepted! Please send a screenshot of your payment to our WhatsApp to start preparation.
                          </p>
                          <p className="mt-1 text-sm text-text-light font-medium text-[#25D366]">
                            Please message {settings.whatsapp}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Premium Status Animations */}
                  {order.status === 'preparing' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white shadow-lg shadow-orange-500/20">
                      <div className="absolute -right-10 -top-10 opacity-10">
                        <ChefHat className="h-40 w-40" />
                      </div>
                      <div className="relative z-10 flex items-center gap-6">
                        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                          <motion.div
                            animate={{ y: [0, -8, 0], rotate: [0, -5, 5, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          >
                            <ChefHat className="h-8 w-8 text-white" />
                          </motion.div>
                          <motion.div
                            className="absolute -bottom-1 -right-1"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <Flame className="h-5 w-5 text-yellow-300" />
                          </motion.div>
                        </div>
                        <div>
                          <h4 className="font-heading text-xl font-bold">Cooking in progress</h4>
                          <p className="text-white/80 font-medium text-sm mt-1">Our chefs are preparing your order with care.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {order.status === 'ready' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-lg shadow-blue-500/20">
                      <div className="absolute -right-10 -top-10 opacity-10">
                        <Package className="h-40 w-40" />
                      </div>
                      <div className="relative z-10 flex items-center gap-6">
                        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 rounded-full border-2 border-white/30"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                            className="absolute inset-0 rounded-full border-2 border-white/30"
                          />
                          <Radar className="h-8 w-8 text-white relative z-10" />
                        </div>
                        <div>
                          <h4 className="font-heading text-xl font-bold">Food is Ready!</h4>
                          <p className="text-white/80 font-medium text-sm mt-1">Assigning a delivery partner to pick it up.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {order.status === 'out_for_delivery' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-light p-6 text-white shadow-lg shadow-primary/20">
                      <div className="absolute -right-10 -top-10 opacity-10">
                        <MapPin className="h-40 w-40" />
                      </div>
                      <div className="relative z-10 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                            <Truck className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-heading text-xl font-bold">On the way</h4>
                            <p className="text-white/80 font-medium text-sm">Your order is out for delivery.</p>
                          </div>
                        </div>
                        <div className="relative w-full h-10 mt-6 rounded-lg overflow-hidden bg-slate-800 shadow-inner border-y-4 border-slate-900 flex items-center">
                          {/* Animated Dashed Road Lines to create movement effect */}
                          <motion.div 
                            initial={{ x: 0 }}
                            animate={{ x: "-32px" }}
                            transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-[-32px] w-[calc(100%+32px)] h-[2px] border-t-[3px] border-dashed border-white/40" 
                          />
                          
                          {/* The Bike moving forward */}
                          <motion.div
                            initial={{ left: "-20%" }}
                            animate={{ left: "120%" }}
                            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                            className="absolute top-1/2 -translate-y-[70%] text-white z-10 drop-shadow-xl"
                          >
                            <Bike className="h-7 w-7" />
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Delivery Partner Info */}
                  {order.status === 'out_for_delivery' && order.driver_id && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card overflow-hidden">
                      <div className="bg-primary/5 p-4 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="h-5 w-5 text-primary" />
                          <h4 className="font-heading font-bold text-text">Delivery Partner</h4>
                        </div>
                        <span className="text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-1 rounded-md">On The Way</span>
                      </div>
                      <div className="p-4 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                        <div className="relative h-20 w-20 rounded-full overflow-hidden shrink-0 border-2 border-border shadow-sm">
                          {order.driver_photo_url ? (
                            <img src={order.driver_photo_url} alt={order.driver_name || 'Driver'} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full bg-accent/20 flex items-center justify-center">
                              <Truck className="h-8 w-8 text-accent" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1 mt-1">
                          <h4 className="font-heading text-xl font-bold text-text">{order.driver_name}</h4>
                          <p className="text-sm font-medium text-text-light">{order.driver_mobile_number}</p>
                          <div className="inline-block px-2.5 py-1 rounded-md bg-accent/10 border border-accent/20 text-xs font-bold text-accent tracking-widest mt-1">
                            {order.driver_vehicle_number}
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-background border-t border-border">
                        <a href={`tel:${order.driver_mobile_number}`} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-button text-sm font-bold text-white transition-colors hover:bg-primary-light shadow-md shadow-primary/20">
                          <Phone className="h-4 w-4" />
                          Call Delivery Partner
                        </a>
                      </div>
                    </motion.div>
                  )}

                  {/* Status Timeline */}
                  <div className="space-y-0 py-4 relative">
                  {STATUS_STEPS.map((step, index) => {
                    const isCompleted = index <= currentStep;
                    const isCurrent = index === currentStep;
                    const isPast = index < currentStep;
                    const Icon = step.icon;

                    return (
                      <div key={step.key} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <motion.div
                            initial={false}
                            animate={{
                              scale: isCurrent ? [1, 1.1, 1] : 1,
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: isCurrent ? Infinity : 0,
                              ease: "easeInOut"
                            }}
                            className={`z-10 flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-500 ${
                              isCompleted ? `${step.color} text-white shadow-md` : 'bg-background border-2 border-border text-text-muted'
                            } ${isCurrent ? `ring-4 ${step.ring}` : ''}`}
                          >
                            <Icon className="h-5 w-5" />
                          </motion.div>
                          {index < STATUS_STEPS.length - 1 && (
                            <div className="h-10 w-0.5 bg-border relative my-1 overflow-hidden">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: isPast ? '100%' : '0%' }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className={`absolute left-0 top-0 w-full ${step.color}`}
                              />
                            </div>
                          )}
                        </div>
                        <div className="pt-2 pb-6">
                          <p className={`text-sm font-bold transition-colors duration-500 ${isCompleted ? 'text-text' : 'text-text-muted'}`}>
                            {step.label}
                          </p>
                          {isCurrent && (
                            <motion.p 
                              initial={{ opacity: 0, x: -10 }} 
                              animate={{ opacity: 1, x: 0 }} 
                              className={`mt-0.5 flex items-center gap-1.5 text-xs font-medium ${step.text}`}
                            >
                              <Clock className="h-3.5 w-3.5 animate-pulse" /> Current status
                            </motion.p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>
              )}

              {/* Cancel / Refund Info (Only show if not delivered and not cancelled) */}
              {!isCancelled && order && order.status !== 'delivered' && (
                <div className="mt-6 border-t border-border pt-6">
                  {canCancel && order.status !== 'cancellation_requested' && (
                    <div className="rounded-xl border border-border p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <h4 className="font-heading text-sm font-semibold text-text">Need to cancel?</h4>
                          <p className="text-xs text-text-light">You can request to cancel this order before we start preparing.</p>
                        </div>
                        <button onClick={handleCancelOrder} className="rounded-lg bg-red-50 px-4 py-2 font-button text-sm font-semibold text-red-600 transition-colors hover:bg-red-100">
                          Request Cancellation
                        </button>
                      </div>
                    </div>
                  )}

                  {order?.status === 'cancellation_requested' && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                      <h4 className="font-heading text-sm font-semibold text-orange-800">Waiting for Restaurant</h4>
                      <p className="text-xs text-orange-700 mt-1">We will notify you once the restaurant approves your cancellation request.</p>
                    </div>
                  )}
                  {!canCancel && order.status !== 'cancellation_requested' && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="font-heading text-sm font-semibold text-blue-800">Need a refund?</p>
                      <p className="mt-1 text-xs text-blue-700">
                        Orders under preparation cannot be cancelled automatically. Please contact us for refund requests.
                      </p>
                      <div className="mt-3 flex gap-3">
                        <a href={`tel:${settings.phone}`} className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm border border-blue-200 hover:bg-blue-100">
                          Call Us
                        </a>
                        <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm border border-blue-200 hover:bg-blue-100">
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Order Items */}
            {orderItems.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-4 font-heading text-base font-semibold text-primary">Items Ordered</h3>
                <div className="space-y-3">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-text-light">{item.product_name} × {item.quantity}</span>
                      <span className="font-medium text-text">{formatPrice(item.subtotal)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between">
                      <span className="font-heading font-semibold text-text">Total</span>
                      <span className="font-heading text-lg font-bold text-primary">{formatPrice(order.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center pt-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <TrackOrderContent />
    </Suspense>
  );
}
