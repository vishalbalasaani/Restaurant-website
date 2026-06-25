'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Upload, Loader2, Truck, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Driver, Order } from '@/lib/types';
import Image from 'next/image';

interface DriverModalProps {
  order: Order;
  onClose: () => void;
  onAssigned: () => void;
}

export function DriverAssignmentModal({ order, onClose, onAssigned }: DriverModalProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    fetchDrivers();
    
    // Subscribe to driver changes so available list updates immediately
    const supabase = createClient();
    const channel = supabase
      .channel('drivers-modal-listener')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        () => fetchDrivers()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchDrivers = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .eq('availability_status', 'Available')
      .eq('is_active', true)
      .order('name');
    
    if (data) {
      setDrivers(data as Driver[]);
    }
    setLoading(false);
  };



  const handleAssignDriver = async (driver: Driver) => {
    setAssigningId(driver.id);
    try {
      const supabase = createClient();
      
      // 1. Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'out_for_delivery',
          driver_id: driver.id,
          driver_name: driver.name,
          driver_mobile_number: driver.mobile_number,
          driver_vehicle_number: driver.vehicle_number,
          driver_photo_url: driver.photo_url,
          driver_assigned_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // 2. Update driver status
      const { error: driverError } = await supabase
        .from('drivers')
        .update({ availability_status: 'Assigned' })
        .eq('id', driver.id);

      if (driverError) throw driverError;

      onAssigned();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Failed to assign driver');
      setAssigningId(null);
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.mobile_number.includes(searchQuery) ||
    d.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
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
          className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-card shadow-2xl border border-border flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-6 bg-background/50">
            <div>
              <h2 className="font-heading text-xl font-bold text-primary">Assign Delivery Driver</h2>
              <p className="text-sm text-text-light mt-1">Order #{order.order_number}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-text-light transition-colors hover:bg-border/50 hover:text-text"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <input 
                    type="text" 
                      placeholder="Search by name, vehicle or phone..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background pl-11 pr-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
              </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                    <p className="text-sm text-text-light">Loading available drivers...</p>
                  </div>
                ) : filteredDrivers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-2xl bg-background/50">
                    <Truck className="h-12 w-12 text-border mb-4" />
                    <p className="font-heading font-bold text-text mb-1">No drivers available</p>
                    <p className="text-sm text-text-light mb-6">There are no drivers matching your criteria.</p>
                    <button 
                      onClick={() => setShowAddForm(true)}
                      className="rounded-xl bg-primary px-6 py-2.5 font-button text-sm font-bold text-white hover:bg-primary-light transition-colors"
                    >
                      Add First Driver
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredDrivers.map(driver => (
                      <div key={driver.id} className="flex flex-col p-4 rounded-2xl border border-border bg-background hover:border-accent/50 transition-colors group">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="relative h-14 w-14 rounded-full overflow-hidden shrink-0 border-2 border-border group-hover:border-accent transition-colors">
                            <Image src={driver.photo_url} alt={driver.name} fill className="object-cover" />
                          </div>
                          <div>
                            <h4 className="font-heading font-bold text-text line-clamp-1">{driver.name}</h4>
                            <p className="text-xs font-medium text-text-light mt-0.5">{driver.mobile_number}</p>
                            <div className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-xs font-bold text-accent">
                              {driver.vehicle_number}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleAssignDriver(driver)}
                          disabled={assigningId !== null}
                          className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/20 py-2.5 font-button text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-50 disabled:hover:bg-primary/10 disabled:hover:text-primary"
                        >
                          {assigningId === driver.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Assign Driver
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
