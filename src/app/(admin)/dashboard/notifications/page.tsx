'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, XCircle, Clock, UtensilsCrossed, Package, Truck, Check, MessageCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Order } from '@/lib/types';
import { formatPrice, playBuzzer, formatDate } from '@/lib/utils';

export default function LiveOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  const fetchLiveOrders = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('status', ['pending_payment', 'awaiting_payment', 'payment_verified', 'preparing', 'ready', 'out_for_delivery', 'cancellation_requested'])
      .order('created_at', { ascending: true });
    
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLiveOrders();

    const supabase = createClient();
    const channel = supabase
      .channel('live-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          fetchLiveOrders();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingOrder(orderId);
    const supabase = createClient();
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    
    if (newStatus === 'cancelled' || newStatus === 'delivered') {
      setOrders(orders.filter(o => o.id !== orderId)); // Remove completed/cancelled orders
    } else {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
    }
    setUpdatingOrder(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'cancellation_requested': return <span className="rounded bg-red-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700 animate-pulse border border-red-200">Cancel Request</span>;
      case 'pending_payment': 
      case 'payment_verified': return <span className="rounded bg-accent/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent border border-accent/30">New Order</span>;
      case 'awaiting_payment': return <span className="rounded bg-yellow-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-700 border border-yellow-200">Awaiting Payment</span>;
      case 'preparing': return <span className="rounded bg-orange-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-700 border border-orange-200">Preparing</span>;
      case 'ready': return <span className="rounded bg-green-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700 border border-green-200">Ready</span>;
      case 'out_for_delivery': return <span className="rounded bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 border border-blue-200">Out for Delivery</span>;
      default: return null;
    }
  };

  const getBorderColor = (status: string) => {
    switch (status) {
      case 'cancellation_requested': return 'border-red-400 shadow-red-100';
      case 'pending_payment': 
      case 'payment_verified': return 'border-accent shadow-accent/20';
      case 'awaiting_payment': return 'border-yellow-400 shadow-yellow-100';
      case 'preparing': return 'border-orange-400 shadow-orange-100';
      case 'ready': return 'border-green-400 shadow-green-100';
      case 'out_for_delivery': return 'border-blue-400 shadow-blue-100';
      default: return 'border-border';
    }
  };

  const renderActionButtons = (order: Order) => {
    if (order.status === 'cancellation_requested') {
      return (
        <div className="grid grid-cols-2 gap-2 bg-background p-4 border-t border-border">
          <button disabled={updatingOrder === order.id} onClick={() => handleStatusUpdate(order.id, 'cancelled')} className="flex items-center justify-center gap-2 rounded-xl bg-red-500 py-3 font-button text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-70">
            {updatingOrder === order.id ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <XCircle className="h-4 w-4 shrink-0" />}
            <span className="truncate">Approve</span>
          </button>
          <button disabled={updatingOrder === order.id} onClick={() => handleStatusUpdate(order.id, 'awaiting_payment')} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-button text-sm font-bold text-text transition-colors hover:bg-background disabled:opacity-70">
            {updatingOrder === order.id ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span className="truncate">Deny</span>
          </button>
        </div>
      );
    }
    
    if (order.status === 'pending_payment') {
      return (
        <div className="grid grid-cols-2 gap-2 bg-background p-4 border-t border-border">
          <button disabled={updatingOrder === order.id} onClick={() => handleStatusUpdate(order.id, 'awaiting_payment')} className="flex items-center justify-center gap-2 rounded-xl bg-accent py-3 font-button text-sm font-bold text-primary transition-colors hover:bg-accent-light disabled:opacity-70">
            {updatingOrder === order.id ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span className="truncate">Accept</span>
          </button>
          <button disabled={updatingOrder === order.id} onClick={() => handleStatusUpdate(order.id, 'cancelled')} className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 font-button text-sm font-bold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-70">
            {updatingOrder === order.id ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <XCircle className="h-4 w-4 shrink-0" />}
            <span className="truncate">Reject</span>
          </button>
        </div>
      );
    }

    if (order.status === 'awaiting_payment') {
      const whatsappMsg = encodeURIComponent(`Hello ${order.customer_name}, your order #${order.order_number} from Flavour House is accepted! Please verify your payment by sending a screenshot here.`);
      const cleanPhone = order.customer_phone.replace(/[^0-9]/g, '');
      return (
        <div className="grid grid-cols-2 gap-2 bg-background p-4 border-t border-border">
          <button disabled={updatingOrder === order.id} onClick={() => handleStatusUpdate(order.id, 'preparing')} className="flex items-center justify-center gap-2 rounded-xl bg-green-500 py-3 font-button text-sm font-bold text-white transition-colors hover:bg-green-600 disabled:opacity-70">
            {updatingOrder === order.id ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span className="truncate">Verify Payment</span>
          </button>
          <a href={`https://wa.me/${cleanPhone}?text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 font-button text-sm font-bold text-white transition-colors hover:bg-[#128C7E]">
            <MessageCircle className="h-4 w-4 shrink-0" />
            <span className="truncate">WhatsApp</span>
          </a>
        </div>
      );
    }

    if (order.status === 'payment_verified') {
      return (
        <div className="grid grid-cols-1 gap-2 bg-background p-4 border-t border-border">
          <button disabled={updatingOrder === order.id} onClick={() => handleStatusUpdate(order.id, 'preparing')} className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-button text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-70">
            {updatingOrder === order.id ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <UtensilsCrossed className="h-4 w-4 shrink-0" />}
            Start Preparing
          </button>
        </div>
      );
    }

    if (order.status === 'preparing') {
      return (
        <div className="grid grid-cols-1 gap-2 bg-background p-4 border-t border-border">
          <button disabled={updatingOrder === order.id} onClick={() => handleStatusUpdate(order.id, 'ready')} className="flex items-center justify-center gap-2 rounded-xl bg-green-500 py-3 font-button text-sm font-bold text-white transition-colors hover:bg-green-600 disabled:opacity-70">
            {updatingOrder === order.id ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Package className="h-4 w-4 shrink-0" />}
            Mark Ready
          </button>
        </div>
      );
    }

    if (order.status === 'ready') {
      const isPickup = order.customer_address === 'Pickup/Dine-in';
      return (
        <div className="grid grid-cols-1 gap-2 bg-background p-4 border-t border-border">
          {isPickup ? (
            <button disabled={updatingOrder === order.id} onClick={() => handleStatusUpdate(order.id, 'delivered')} className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 font-button text-sm font-bold text-white transition-colors hover:bg-blue-600 disabled:opacity-70">
              {updatingOrder === order.id ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Check className="h-4 w-4 shrink-0" />}
              Mark Picked Up
            </button>
          ) : (
            <button disabled={updatingOrder === order.id} onClick={() => handleStatusUpdate(order.id, 'out_for_delivery')} className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 font-button text-sm font-bold text-white transition-colors hover:bg-blue-600 disabled:opacity-70">
              {updatingOrder === order.id ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Truck className="h-4 w-4 shrink-0" />}
              Send Out for Delivery
            </button>
          )}
        </div>
      );
    }

    if (order.status === 'out_for_delivery') {
      return (
        <div className="grid grid-cols-1 gap-2 bg-background p-4 border-t border-border">
          <button disabled={updatingOrder === order.id} onClick={() => handleStatusUpdate(order.id, 'delivered')} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-button text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-70">
            {updatingOrder === order.id ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            Mark Delivered
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20">
          <Bell className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-primary">Live Orders Workflow</h1>
          <p className="text-sm text-text-light">Manage the entire lifecycle of active orders</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <UtensilsCrossed className="mx-auto mb-4 h-12 w-12 text-border" />
          <p className="text-lg font-medium text-text">No active orders right now</p>
          <p className="text-sm text-text-light">We will notify you when a new order arrives.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {orders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`flex flex-col justify-between overflow-hidden rounded-2xl border-2 bg-card shadow-md transition-colors duration-300 ${getBorderColor(order.status)}`}
              >
                <div className="p-6">
                  <div className="mb-4 flex items-start justify-between border-b border-border pb-4">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-primary">{order.order_number}</h3>
                      <p className="text-xs font-medium text-text-muted mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDate(order.created_at)}
                      </p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="mb-6">
                    <p className="font-semibold text-text">{order.customer_name}</p>
                    <p className="text-sm text-text-muted">{order.customer_phone}</p>
                    {order.customer_address !== 'Pickup/Dine-in' ? (
                      <p className="mt-2 text-sm text-text-light border-l-2 border-accent pl-2">
                        {order.customer_address}
                      </p>
                    ) : (
                      <span className="mt-2 inline-block rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                        Pickup
                      </span>
                    )}
                    {order.order_notes && (
                      <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs font-medium text-amber-800 border border-amber-100">
                        Note: {order.order_notes}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 border-t border-border pt-4">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="font-medium text-text">
                          {item.quantity}x <span className="font-normal">{item.product_name}</span>
                        </span>
                        <span className="text-text-muted">{formatPrice(item.subtotal)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-dashed border-border pt-3 font-heading font-bold text-primary">
                      <span>Total</span>
                      <span>{formatPrice(order.total_amount)}</span>
                    </div>
                  </div>
                </div>

                {renderActionButtons(order)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
