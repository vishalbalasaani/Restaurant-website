'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, ShoppingBag, IndianRupee } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';

interface DailyData {
  date: string;
  orders: number;
  revenue: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending_payment: '#E65100',
  payment_verified: '#1565C0',
  preparing: '#F57F17',
  ready: '#2E7D32',
  out_for_delivery: '#0277BD',
  delivered: '#1B5E20',
  cancelled: '#C62828',
};

export default function AnalyticsPage() {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [totals, setTotals] = useState({ totalOrders: 0, totalRevenue: 0, avgOrder: 0 });
  const [period, setPeriod] = useState<'7' | '30'>('7');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(period));

        const { data: orders } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', daysAgo.toISOString())
          .order('created_at');

        if (!orders || orders.length === 0) {
          setDailyData([]);
          setStatusData([]);
          setTotals({ totalOrders: 0, totalRevenue: 0, avgOrder: 0 });
          setLoading(false);
          return;
        }

        // Aggregate by day
        const byDay = new Map<string, { orders: number; revenue: number }>();
        const byStatus = new Map<string, number>();

        orders.forEach((order) => {
          const day = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          const existing = byDay.get(day) || { orders: 0, revenue: 0 };
          byDay.set(day, {
            orders: existing.orders + 1,
            revenue: existing.revenue + (order.status === 'delivered' ? Number(order.total_amount) : 0),
          });

          byStatus.set(order.status, (byStatus.get(order.status) || 0) + 1);
        });

        setDailyData(
          Array.from(byDay.entries()).map(([date, data]) => ({ date, ...data }))
        );

        setStatusData(
          Array.from(byStatus.entries()).map(([name, value]) => ({
            name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            value,
            color: STATUS_COLORS[name] || '#999',
          }))
        );

        const validOrders = orders.filter((o) => o.status === 'delivered');
        const totalRevenue = validOrders.reduce((s, o) => s + Number(o.total_amount), 0);
        
        setTotals({
          totalOrders: orders.length, // keep total orders to show total volume including cancelled
          totalRevenue,
          avgOrder: validOrders.length > 0 ? totalRevenue / validOrders.length : 0,
        });
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [period]);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold text-primary">Analytics</h2>
        <div className="flex gap-2">
          {(['7', '30'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                period === p ? 'bg-primary text-white' : 'bg-card text-text-light border border-border hover:border-accent'
              }`}
            >
              {p === '7' ? 'Last 7 Days' : 'Last 30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Orders', value: totals.totalOrders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Revenue', value: formatPrice(totals.totalRevenue), icon: IndianRupee, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Avg. Order Value', value: formatPrice(totals.avgOrder), icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10' },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-border bg-card p-6 card-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-light">{card.label}</p>
                <p className="mt-1 font-heading text-2xl font-bold text-primary">{loading ? '—' : card.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-border bg-card p-6 card-shadow lg:col-span-2">
          <h3 className="mb-4 font-heading text-base font-semibold text-primary">
            <BarChart3 className="mr-2 inline h-4 w-4 text-accent" />
            Orders & Revenue
          </h3>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : dailyData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-text-light">No data available for this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#666' }} stroke="#E5E5E5" tickMargin={10} />
                <YAxis tick={{ fontSize: 12, fill: '#666' }} stroke="#E5E5E5" tickMargin={10} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: 16, border: 'none', fontSize: 13, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', padding: '12px 16px' }}
                  formatter={(value: any, name: any) => [
                    <span key={name} className="font-semibold text-primary">
                      {name === 'revenue' ? formatPrice(Number(value)) : value}
                    </span>,
                    <span key={name + '-label'} className="text-text-light capitalize">
                      {name === 'revenue' ? 'Revenue' : 'Orders'}
                    </span>,
                  ]}
                />
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4A373" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#D4A373" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2C1810" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#2C1810" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <Bar dataKey="orders" fill="url(#colorOrders)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="revenue" fill="url(#colorRevenue)" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Pie Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-border bg-card p-6 card-shadow">
          <h3 className="mb-4 font-heading text-base font-semibold text-primary">Order Status</h3>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : statusData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-text-light">No data available.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: 16, border: 'none', fontSize: 13, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ fontWeight: 600 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-text-light">{s.name}</span>
                    </div>
                    <span className="font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
