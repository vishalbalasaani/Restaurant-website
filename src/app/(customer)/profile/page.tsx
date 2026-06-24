'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Package, LogOut, Clock, Star, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Order, Profile } from '@/lib/types';
import { formatPrice, formatDate } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/lib/types';

export default function CustomerProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileAndOrders = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/signin');
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (prof) setProfile(prof);

      const { data: ords } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (ords) setOrders(ords);

      setLoading(false);
    };

    fetchProfileAndOrders();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/home');
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background">
      <div className="mx-auto max-w-4xl px-4 md:px-8">
        
        {/* Profile Header */}
        <div className="mb-8 rounded-3xl bg-card p-8 border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="font-heading text-3xl font-bold text-primary mb-2">
              Hello, {profile?.full_name || 'Foodie'}!
            </h1>
            <p className="text-text-light flex items-center gap-2">
              <span className="inline-block bg-accent/20 text-accent px-2 py-0.5 rounded-full text-xs font-bold">
                {profile?.mobile_number || 'No Phone'}
              </span>
              Member since {profile ? new Date(profile.created_at).getFullYear() : 'Now'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl bg-red-50 text-red-600 px-4 py-2 font-button text-sm font-semibold hover:bg-red-100 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        {/* Order History */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-text">Your Order History</h2>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-3xl bg-card p-12 text-center border border-border">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-background">
                <Clock className="h-8 w-8 text-text-muted" />
              </div>
              <h3 className="font-heading text-xl font-bold text-text mb-2">No orders yet</h3>
              <p className="text-text-light mb-6">You haven&apos;t placed any orders yet. Let&apos;s fix that!</p>
              <button 
                onClick={() => router.push('/menu')}
                className="rounded-xl bg-accent px-6 py-3 font-button text-sm font-semibold text-primary hover:bg-accent-light transition-colors"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {orders.map((order, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={order.id} 
                  className="rounded-2xl border border-border bg-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-accent transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-heading font-bold text-primary">#{order.order_number}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}
                      </span>
                    </div>
                    <div className="text-sm text-text-light flex items-center gap-4">
                      <span>{formatDate(order.created_at)}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{order.customer_address}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between md:flex-col md:items-end gap-2 border-t border-border pt-4 md:border-0 md:pt-0">
                    <span className="font-heading text-lg font-bold text-text">{formatPrice(order.total_amount)}</span>
                    {order.rating ? (
                      <div className="flex items-center gap-1 text-xs font-medium text-text-muted">
                        Rated: {order.rating} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      </div>
                    ) : (
                      <button 
                        onClick={() => router.push(`/track?order=${order.order_number}`)}
                        className="text-xs font-bold text-accent hover:underline"
                      >
                        {order.status === 'delivered' ? 'Leave a Rating' : 'Track Order'}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
