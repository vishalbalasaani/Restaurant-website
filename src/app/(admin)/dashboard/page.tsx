'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Clock, CheckCircle2, IndianRupee, TrendingUp, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/lib/types';
import type { Order } from '@/lib/types';

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

export default function DashboardOverview() {
  const [stats, setStats] = useState({ today: 0, pending: 0, completed: 0, revenue: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const supabase = createClient();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch today's orders
        const { data: todayOrders } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', today.toISOString())
          .order('created_at', { ascending: false });

        const orders = todayOrders || [];
        const pending = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;
        const completed = orders.filter((o) => o.status === 'delivered').length;
        const revenue = orders
          .filter((o) => o.status === 'delivered')
          .reduce((sum, o) => sum + Number(o.total_amount), 0);

        setStats({ today: orders.length, pending, completed, revenue });

        // Fetch recent orders (last 10)
        const { data: recent } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        setRecentOrders(recent || []);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Real-time subscription for new orders
    const supabase = createClient();
    const channel = supabase
      .channel('dashboard-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const statCards: StatCard[] = [
    { label: "Today's Orders", value: stats.today, icon: ShoppingBag, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'Pending Orders', value: stats.pending, icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50' },
    { label: "Today's Revenue", value: formatPrice(stats.revenue), icon: IndianRupee, color: 'text-accent', bgColor: 'bg-accent/10' },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border bg-card p-6 card-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-text-light">{card.label}</p>
                <p className="mt-1 font-heading text-3xl font-bold text-primary">
                  {loading ? '—' : card.value}
                </p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Orders Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border bg-card card-shadow"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-heading text-lg font-semibold text-primary">Recent Orders</h3>
          <a href="/dashboard/orders" className="text-sm font-medium text-accent transition-colors hover:text-secondary">
            View All →
          </a>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto mb-3 h-12 w-12 text-border" />
            <p className="text-sm text-text-light">No orders yet. They&apos;ll appear here in real-time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-background/50">
                    <td className="px-6 py-4 font-heading text-sm font-semibold text-accent">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-text">{order.customer_name}</p>
                      <p className="text-xs text-text-muted">{order.customer_phone}</p>
                    </td>
                    <td className="px-6 py-4 font-heading text-sm font-semibold text-primary">
                      {formatPrice(order.total_amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        order.status === 'delivered' ? 'bg-green-50 text-green-700' :
                        order.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                        order.status === 'pending_payment' ? 'bg-orange-50 text-orange-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-light">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
