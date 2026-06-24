'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, Check, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Order } from '@/lib/types';
import { formatPrice, playBuzzer } from '@/lib/utils';

export function IncomingOrders() {
  const [queue, setQueue] = useState<Order[]>([]);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('incoming_orders_listener')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order;
          // Play a distinct 3-chime restaurant buzzer tone
          playBuzzer();
          
          setTimeout(() => {
            supabase.from('order_items').select('*').eq('order_id', newOrder.id).then(({ data }) => {
              if (data) {
                newOrder.order_items = data;
              }
              setQueue((prev) => [...prev, newOrder]);
            });
          }, 1500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAcknowledge = (id: string) => {
    setQueue((prev) => prev.filter((o) => o.id !== id));
  };

  const handleViewOrder = (id: string) => {
    handleAcknowledge(id);
    router.push('/dashboard/orders');
  };

  if (queue.length === 0) return null;

  const currentOrder = queue[0];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] flex flex-wrap justify-end items-end gap-4 p-4 pointer-events-none overflow-y-auto max-h-screen">
      <AnimatePresence>
        {queue.map((order) => (
          <motion.div 
            key={order.id}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className="w-full max-w-sm shrink-0 rounded-2xl bg-card p-6 shadow-2xl border-2 border-accent pointer-events-auto"
          >
            <div className="mb-4 flex flex-col items-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20 animate-pulse">
                <BellRing className="h-7 w-7 text-accent" />
              </div>
              <h2 className="font-heading text-xl font-bold text-primary mb-1">New Order!</h2>
              <p className="text-sm text-text-light">
                From <span className="font-bold text-text">{order.customer_name}</span>
              </p>
            </div>

            <div className="mb-4 rounded-xl bg-background p-3 border border-border">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-text-muted">Order ID</span>
                <span className="font-heading text-xs font-bold text-accent">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-text-muted">Total</span>
                <span className="font-heading text-sm font-bold text-primary">{formatPrice(order.total_amount)}</span>
              </div>
            </div>

            {order.order_notes && (
              <div className="mb-4 rounded-xl bg-amber-50 p-3 border border-amber-200">
                <span className="text-xs font-bold text-amber-800 uppercase block mb-1">Instructions:</span>
                <p className="text-sm text-amber-900 italic">{order.order_notes}</p>
              </div>
            )}

            {order.order_items && order.order_items.length > 0 && (
              <div className="mb-6 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                <span className="text-xs font-bold text-text-muted uppercase block mb-2">Order Items:</span>
                <div className="flex flex-col gap-2">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                      <span className="font-medium text-text">{item.quantity}x <span className="font-normal text-text-light">{item.product_name}</span></span>
                      <span className="font-semibold text-text">{formatPrice(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button 
                onClick={() => handleViewOrder(order.id)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 font-button text-sm font-semibold text-white transition-all hover:bg-primary-light shadow-lg hover:shadow-primary/25"
              >
                <Eye className="h-4 w-4" />
                View Order
              </button>
              <button 
                onClick={() => handleAcknowledge(order.id)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-card px-3 py-2 font-button text-sm font-semibold text-text border border-border transition-all hover:bg-background"
              >
                <Check className="h-4 w-4" />
                Dismiss
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
