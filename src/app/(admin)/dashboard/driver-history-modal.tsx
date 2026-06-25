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
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border border-border rounded-xl p-5 bg-background shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between border-b border-border/50 pb-4 mb-4">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-text">{order.order_number}</h3>
                      <p className="text-xs text-text-muted mt-1">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-heading text-lg font-bold text-primary">{formatPrice(order.total_amount)}</span>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 inline-block px-2 py-0.5 rounded-full mt-1 border border-green-200">
                        Delivered
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-bold uppercase text-text-muted mb-2 flex items-center gap-1">
                        Customer Details
                      </h4>
                      <p className="font-medium text-text">{order.customer_name}</p>
                      <p className="text-sm text-text-light">{order.customer_phone}</p>
                      <div className="flex items-start gap-1 mt-2 text-sm text-text-light bg-accent/5 p-2 rounded-lg border border-accent/10">
                        <MapPin className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                        <p>{order.customer_address}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-xs font-bold uppercase text-text-muted mb-2">Order Items</h4>
                      <div className="space-y-1.5">
                        {order.order_items?.map((item: any) => (
                          <div key={item.id} className="flex items-start gap-2 text-sm">
                            <span className="font-bold text-text">{item.quantity}x</span>
                            <span className="text-text-light break-words">{item.product_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
