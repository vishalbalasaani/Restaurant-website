'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Eye, Trash2, Package, X, ExternalLink, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate, getWhatsAppLink, formatOrderForWhatsApp } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STATUS_FLOW } from '@/lib/types';
import type { Order, OrderItem, OrderStatus } from '@/lib/types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [cancelPromptOrder, setCancelPromptOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });
      setOrders(data || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const supabase = createClient();
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    setModalLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      setOrderItems(data || []);
    } catch {
      setOrderItems([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, bypassConfirm = false) => {
    if (newStatus === 'cancelled' && !bypassConfirm) {
      const orderToCancel = orders.find((o) => o.id === orderId);
      if (orderToCancel) setCancelPromptOrder(orderToCancel);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        alert(`Failed to update order: ${error.message}`);
        console.error(error);
        return;
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      alert('An unexpected error occurred while updating the order.');
      console.error(err);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
      const supabase = createClient();
      await supabase.from('order_items').delete().eq('order_id', orderId);
      await supabase.from('orders').delete().eq('id', orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
    } catch {
      // Handle error
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order ID, name, or phone..."
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {['all', ...ORDER_STATUS_FLOW, 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'bg-card text-text-light border border-border hover:border-accent'
              }`}
            >
              {status === 'all' ? 'All' : ORDER_STATUS_LABELS[status as OrderStatus]}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-border bg-card card-shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto mb-3 h-12 w-12 text-border" />
            <p className="text-sm text-text-light">No orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-background/50">
                    <td className="px-6 py-4 font-heading text-sm font-semibold text-accent">
                      <p>{order.order_number}</p>
                      {order.order_notes && (
                        <p className="mt-1 text-xs text-amber-600 font-medium bg-amber-50 rounded px-2 py-1 inline-block border border-amber-100">
                          Note: {order.order_notes}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-text">{order.customer_name}</p>
                      <p className="text-xs text-text-muted">{order.customer_phone}</p>
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <div className="flex flex-col gap-1">
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="text-xs text-text flex items-start gap-1">
                            <span className="font-bold shrink-0">{item.quantity}x</span> 
                            <span className="break-words whitespace-normal">{item.product_name}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-heading text-sm font-semibold">{formatPrice(order.total_amount)}</td>
                    <td className="px-6 py-4">
                      {order.status === 'delivered' || order.status === 'cancelled' ? (
                        <span className={`inline-block rounded-lg border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider opacity-80 ${
                          order.status === 'delivered' ? 'border-green-200 bg-green-50 text-green-800' : 
                          'border-red-200 bg-red-50 text-red-800'
                        }`}>
                          {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                        </span>
                      ) : (
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateStatus(order.id, e.target.value as OrderStatus)}
                          className={`cursor-pointer rounded-lg border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider outline-none transition-all ${
                            order.status === 'out_for_delivery' ? 'border-purple-300 bg-purple-100 text-purple-900 hover:border-purple-400 hover:bg-purple-200' :
                            order.status === 'preparing' ? 'border-blue-300 bg-blue-100 text-blue-900 hover:border-blue-400 hover:bg-blue-200' :
                            order.status === 'ready' ? 'border-cyan-300 bg-cyan-100 text-cyan-900 hover:border-cyan-400 hover:bg-cyan-200' :
                            order.status === 'pending_payment' ? 'border-amber-300 bg-amber-100 text-amber-900 hover:border-amber-400 hover:bg-amber-200' :
                            order.status === 'payment_verified' ? 'border-lime-300 bg-lime-100 text-lime-900 hover:border-lime-400 hover:bg-lime-200' :
                            order.status === 'cancellation_requested' ? 'border-red-400 bg-red-100 text-red-900 hover:border-red-500 hover:bg-red-200 animate-pulse' :
                            'border-orange-200 bg-orange-50 text-orange-800 hover:border-orange-300'
                          }`}
                        >
                          {Object.entries(ORDER_STATUS_LABELS)
                            .filter(([val]) => val !== 'cancellation_requested')
                            .map(([val, label]) => (
                              <option key={val} value={val} className="bg-background text-text font-medium">
                                {label}
                              </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {order.rating ? (
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-text">{order.rating}</span>
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        </div>
                      ) : (
                        <span className="text-sm text-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-light">{formatDate(order.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleViewOrder(order)} className="rounded-lg p-2 text-text-muted hover:bg-background hover:text-primary" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteOrder(order.id)} className="rounded-lg p-2 text-text-muted hover:bg-red-50 hover:text-red-500" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading text-xl font-bold text-primary">Order Details</h3>
                <button onClick={() => setSelectedOrder(null)} className="rounded-lg p-2 text-text-muted hover:bg-background"><X className="h-4 w-4" /></button>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl bg-background p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-text-muted">Order ID</span>
                    <span className="font-heading text-sm font-bold text-accent">{selectedOrder.order_number}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-text-muted">Status</span>
                    <span className="text-sm font-medium">{ORDER_STATUS_LABELS[selectedOrder.status as OrderStatus]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Date</span>
                    <span className="text-sm">{formatDate(selectedOrder.created_at)}</span>
                  </div>
                  
                  {selectedOrder.rating && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-text-muted">Customer Rating</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`h-4 w-4 ${star <= selectedOrder.rating! ? 'fill-amber-400 text-amber-400' : 'text-border-light'}`} />
                          ))}
                        </div>
                      </div>
                      {selectedOrder.review_comment && (
                        <div className="rounded-lg bg-card p-3 border border-border">
                          <p className="text-sm italic text-text-light">"{selectedOrder.review_comment}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-background p-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase text-text-muted">Customer</h4>
                  <p className="text-sm font-medium text-text">{selectedOrder.customer_name}</p>
                  <p className="text-sm text-text-light">{selectedOrder.customer_phone}</p>
                  {selectedOrder.customer_email && <p className="text-sm text-text-light">{selectedOrder.customer_email}</p>}
                  <p className="mt-1 text-sm text-text-light">{selectedOrder.customer_address}</p>
                  {selectedOrder.order_notes && <p className="mt-2 text-xs italic text-text-muted">Note: {selectedOrder.order_notes}</p>}
                </div>

                {!modalLoading && orderItems.length > 0 && (
                  <div className="rounded-xl bg-background p-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase text-text-muted">Items</h4>
                    <div className="space-y-2">
                      {orderItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-text-light">{item.product_name} × {item.quantity}</span>
                          <span className="font-medium">{formatPrice(item.subtotal)}</span>
                        </div>
                      ))}
                      <div className="border-t border-border pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="font-semibold">Total</span>
                          <span className="font-heading text-lg font-bold text-primary">{formatPrice(selectedOrder.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                  <div className="mt-6 flex flex-col gap-3 pt-4 border-t border-border">
                    <h4 className="text-xs font-semibold uppercase text-text-muted mb-2">Update Order Status</h4>
                    
                    {selectedOrder.status === 'pending_payment' && (
                      <button 
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')} 
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-4 font-button text-sm font-bold text-white transition-all hover:bg-blue-700 shadow-lg hover:shadow-blue-600/25"
                      >
                        Accept & Start Preparing 👨‍🍳
                      </button>
                    )}
                    
                    {selectedOrder.status === 'preparing' && (
                      <button 
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'out_for_delivery')} 
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-4 font-button text-sm font-bold text-primary transition-all hover:bg-accent-light shadow-lg hover:shadow-accent/25"
                      >
                        Mark Ready / Out for Delivery 🚚
                      </button>
                    )}
                    
                    {selectedOrder.status === 'out_for_delivery' && (
                      <button 
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')} 
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-4 font-button text-sm font-bold text-white transition-all hover:bg-green-700 shadow-lg hover:shadow-green-600/25"
                      >
                        Complete & Mark Delivered ✅
                      </button>
                    )}
                    
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')} 
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-button text-sm font-semibold text-red-600 transition-all hover:bg-red-100"
                    >
                      Cancel Order ❌
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Cancel Order Modal */}
      <AnimatePresence>
        {cancelPromptOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              onClick={() => setCancelPromptOrder(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card p-8 shadow-2xl border-2 border-red-500/20"
            >
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <Trash2 className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-text">Cancel Order?</h3>
                <p className="mt-2 text-sm text-text-light">
                  You are about to cancel this order. This action cannot be undone.
                </p>
              </div>

              <div className="mb-8 space-y-3 rounded-xl bg-background p-4 border border-border">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-sm text-text-muted">Order ID</span>
                  <span className="font-heading text-sm font-bold text-accent">{cancelPromptOrder.order_number}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-sm text-text-muted">Customer</span>
                  <span className="text-sm font-medium text-text">{cancelPromptOrder.customer_name}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-sm text-text-muted">Phone</span>
                  <span className="text-sm font-medium text-text">{cancelPromptOrder.customer_phone}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-sm text-text-muted">Payment Status</span>
                  <span className={`text-sm font-bold uppercase ${cancelPromptOrder.status === 'pending_payment' ? 'text-orange-600' : 'text-green-600'}`}>
                    {cancelPromptOrder.status === 'pending_payment' ? 'Not Paid' : 'Completed'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCancelPromptOrder(null)}
                  className="flex-1 rounded-xl bg-background px-4 py-3 font-button text-sm font-semibold text-text transition-colors hover:bg-border border border-border"
                >
                  Keep Order
                </button>
                <button
                  onClick={() => {
                    handleUpdateStatus(cancelPromptOrder.id, 'cancelled', true);
                    setCancelPromptOrder(null);
                  }}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-button text-sm font-semibold text-white transition-colors hover:bg-red-700 shadow-lg hover:shadow-red-600/25"
                >
                  Confirm Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
