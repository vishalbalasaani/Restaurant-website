'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, XCircle, Clock, UtensilsCrossed } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Order } from '@/lib/types';
import { formatPrice, playBuzzer, formatDate } from '@/lib/utils';

export default function LiveOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveOrders = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('status', ['pending_payment', 'payment_verified', 'cancellation_requested'])
      .order('created_at', { ascending: true });
    
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLiveOrders();

    const supabase = createClient();
    const channel = supabase
      .channel('live-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
             playBuzzer();
          } else if (payload.eventType === 'UPDATE') {
             const newStatus = (payload.new as Order).status;
             const oldStatus = (payload.old as Order).status;
             if (newStatus === 'cancellation_requested' && oldStatus !== 'cancellation_requested') {
               playBuzzer();
             }
          }
          fetchLiveOrders();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const supabase = createClient();
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    setOrders(orders.filter(o => o.id !== orderId)); // Optimistic remove
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20">
          <Bell className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-primary">Live Orders</h1>
          <p className="text-sm text-text-light">Manage incoming orders and cancellation requests</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center card-shadow">
          <UtensilsCrossed className="mx-auto mb-4 h-12 w-12 text-border" />
          <p className="text-lg font-medium text-text">No live orders right now</p>
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
                className={`flex flex-col justify-between overflow-hidden rounded-2xl border-2 bg-card card-shadow ${
                  order.status === 'cancellation_requested' ? 'border-red-400' : 'border-accent'
                }`}
              >
                <div className="p-6">
                  <div className="mb-4 flex items-start justify-between border-b border-border pb-4">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-primary">{order.order_number}</h3>
                      <p className="text-xs font-medium text-text-muted mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDate(order.created_at)}
                      </p>
                    </div>
                    {order.status === 'cancellation_requested' ? (
                      <span className="rounded bg-red-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700 animate-pulse">
                        Cancel Request
                      </span>
                    ) : (
                      <span className="rounded bg-accent/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                        New Order
                      </span>
                    )}
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

                <div className="grid grid-cols-2 gap-2 bg-background p-4 border-t border-border">
                  {order.status === 'cancellation_requested' ? (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                        className="flex items-center justify-center gap-2 rounded-xl bg-red-500 py-3 font-button text-sm font-bold text-white transition-colors hover:bg-red-600"
                      >
                        <XCircle className="h-4 w-4" />
                        Approve Cancel
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'preparing')}
                        className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-button text-sm font-bold text-text transition-colors hover:bg-background"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Deny / Keep
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'preparing')}
                        className="flex items-center justify-center gap-2 rounded-xl bg-accent py-3 font-button text-sm font-bold text-primary transition-colors hover:bg-accent-light"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                        className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 font-button text-sm font-bold text-red-600 transition-colors hover:bg-red-100"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
