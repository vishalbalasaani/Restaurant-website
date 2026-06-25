'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Loader2, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Order } from '@/lib/types';
import { formatPrice, formatDate } from '@/lib/utils';

interface DriverHistoryModalProps {
  driverId: string;
  driverName: string;
  onClose: () => void;
}

export function DriverHistoryModal({ driverId, driverName, onClose }: DriverHistoryModalProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('driver_id', driverId)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });
        
      if (data) {
        setOrders(data as Order[]);
      }
      setLoading(false);
    };

    fetchOrders();
  }, [driverId]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }} 
        className="relative w-full max-w-3xl flex flex-col bg-card rounded-2xl shadow-2xl overflow-hidden max-h-[85vh]"
      >
        <div className="flex items-center justify-between border-b border-border p-6 bg-background">
          <div>
            <h2 className="font-heading text-xl font-bold text-primary">Delivery History</h2>
            <p className="text-sm font-medium text-text-light mt-1">
              Viewing past delivered orders for <span className="font-bold text-accent">{driverName}</span>
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-text-muted hover:bg-border transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-card">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-text-muted">Loading delivery history...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-2xl bg-background/50">
              <Package className="h-12 w-12 text-border mb-4" />
              <h3 className="font-heading text-lg font-bold text-text mb-1">No Deliveries Yet</h3>
              <p className="text-sm text-text-light max-w-sm">
                This driver hasn't completed any deliveries yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-background">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-background/80 border-b border-border text-xs uppercase tracking-wider text-text-muted font-bold">
                  <tr>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Items</th>
                    <th className="p-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-accent/5 transition-colors">
                      <td className="p-4">
                        <span className="font-heading font-bold text-text">{order.order_number}</span>
                      </td>
                      <td className="p-4 text-xs font-medium text-text-light whitespace-nowrap">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-text text-sm">{order.customer_name}</p>
                        <p className="text-xs text-text-muted">{order.customer_phone}</p>
                        <div className="flex items-start gap-1 mt-1 text-[10px] text-text-light bg-accent/5 p-1 rounded border border-accent/10 max-w-[200px]">
                          <MapPin className="h-3 w-3 shrink-0 text-accent" />
                          <p className="truncate">{order.customer_address}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 text-xs">
                          {order.order_items?.map((item: any) => (
                            <span key={item.id} className="text-text-light">
                              <span className="font-bold text-text">{item.quantity}x</span> {item.product_name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="font-heading text-sm font-bold text-primary mb-1">
                          {formatPrice(order.total_amount)}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 inline-block px-2 py-0.5 rounded border border-green-200">
                          Delivered
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
