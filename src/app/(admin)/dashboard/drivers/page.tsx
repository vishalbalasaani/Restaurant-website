'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, CheckCircle2, Clock, Loader2, Power } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Driver, Order } from '@/lib/types';
import Image from 'next/image';

interface DriverStat extends Driver {
  delivered_orders: number;
  active_orders: number;
}

export default function DriversPage() {
  const [driverStats, setDriverStats] = useState<DriverStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchDriversAndStats = async () => {
    try {
      const supabase = createClient();
      
      const { data: driversData } = await supabase.from('drivers').select('*').order('name');
      const { data: allOrders } = await supabase.from('orders').select('driver_id, status').not('driver_id', 'is', null);
      
      if (driversData) {
        const stats: DriverStat[] = driversData.map((d: Driver) => {
          const driverOrders = allOrders?.filter(o => o.driver_id === d.id) || [];
          return {
            ...d,
            delivered_orders: driverOrders.filter(o => o.status === 'delivered').length,
            active_orders: driverOrders.filter(o => o.status === 'out_for_delivery').length,
          };
        });
        setDriverStats(stats);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriversAndStats();

    const supabase = createClient();
    const channel = supabase
      .channel('drivers_page_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        () => fetchDriversAndStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchDriversAndStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleDriverStatus = async (driverId: string, currentStatus: boolean) => {
    setTogglingId(driverId);
    try {
      const supabase = createClient();
      await supabase.from('drivers').update({ is_active: !currentStatus }).eq('id', driverId);
      // Local state update is handled by the realtime subscription
    } catch (error) {
      console.error('Error toggling driver status:', error);
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-primary">Driver Management</h1>
        <p className="mt-2 text-text-light">
          Monitor your fleet, track deliveries, and toggle driver availability.
        </p>
      </div>

      {driverStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card p-12 text-center card-shadow">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-accent/20">
            <Truck className="h-12 w-12 text-accent" />
          </div>
          <h2 className="mb-2 font-heading text-2xl font-bold text-primary">No Drivers Yet</h2>
          <p className="text-text-light">
            You can add new delivery drivers directly from the "Assign Driver" modal on the Live Orders board.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {driverStats.map((driver) => (
            <motion.div 
              key={driver.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col md:flex-row items-center justify-between overflow-hidden rounded-2xl border ${driver.is_active ? 'border-border' : 'border-border/50 opacity-75'} bg-card p-4 shadow-sm hover:shadow-md transition-all gap-4`}
            >
              {/* Driver Info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`relative h-16 w-16 shrink-0 rounded-full overflow-hidden border-2 shadow-sm ${driver.is_active ? 'border-border' : 'border-border/50 grayscale'}`}>
                  <Image src={driver.photo_url} alt={driver.name} fill className="object-cover" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-heading text-lg font-bold text-text truncate">{driver.name}</h3>
                    {!driver.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                        Offline
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        driver.availability_status === 'Available' 
                          ? 'bg-green-100 text-green-700 border border-green-200' 
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {driver.availability_status === 'Available' ? <CheckCircle2 className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                        {driver.availability_status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-text-light">
                    <span>{driver.mobile_number}</span>
                    <span className="h-1 w-1 rounded-full bg-border-light"></span>
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold border ${driver.is_active ? 'bg-accent/10 text-accent border-accent/20' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                      {driver.vehicle_number}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex items-center gap-8 md:px-8 border-y md:border-y-0 py-4 md:py-0 w-full md:w-auto border-border">
                <div className="flex flex-col items-center justify-center flex-1 md:flex-none">
                  <span className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Total
                  </span>
                  <span className="font-heading text-xl font-bold text-text">{driver.delivered_orders}</span>
                </div>
                <div className="h-10 w-px bg-border hidden md:block"></div>
                <div className="flex flex-col items-center justify-center flex-1 md:flex-none">
                  <span className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Active
                  </span>
                  <span className={`font-heading text-xl font-bold ${driver.active_orders > 0 ? 'text-accent' : 'text-text'}`}>{driver.active_orders}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end w-full md:w-auto shrink-0 pl-2">
                <button
                  onClick={() => toggleDriverStatus(driver.id, driver.is_active)}
                  disabled={togglingId === driver.id}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    driver.is_active 
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                      : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                  }`}
                >
                  {togglingId === driver.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                  {driver.is_active ? "Mark Offline" : "Mark Online"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
