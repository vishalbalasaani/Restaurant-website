'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, CheckCircle2, Clock, Loader2, Power, Plus, Upload, X, MapPin, Phone, FileText, Search, Trash2, Edit2, ShieldAlert, CheckCircle, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DriverHistoryModal } from '../driver-history-modal';
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

  // New Driver Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newVehicle, setNewVehicle] = useState('');
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string>('');
  const [savingDriver, setSavingDriver] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [viewingDriver, setViewingDriver] = useState<{id: string, name: string} | null>(null);

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

  const markDriverArrived = async (driverId: string) => {
    setTogglingId(driverId);
    try {
      const supabase = createClient();
      await supabase.from('drivers').update({ availability_status: 'Available' }).eq('id', driverId);
    } catch (error) {
      console.error('Error marking driver arrived:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewPhoto(file);
      setNewPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveNewDriver = async () => {
    if (!newName || !newMobile || !newVehicle || !newPhoto) {
      alert('Please fill all fields and upload a photo');
      return;
    }

    setSavingDriver(true);
    try {
      const supabase = createClient();
      
      const fileExt = newPhoto.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('driver-images')
        .upload(filePath, newPhoto);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('driver-images')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('drivers')
        .insert({
          name: newName,
          mobile_number: newMobile,
          vehicle_number: newVehicle,
          photo_url: publicUrl,
          availability_status: 'Available',
          is_active: true
        });

      if (insertError) throw insertError;

      setNewName('');
      setNewMobile('');
      setNewVehicle('');
      setNewPhoto(null);
      setNewPhotoPreview('');
      setShowAddForm(false);
      
      await fetchDriversAndStats();
    } catch (err: any) {
      console.error(err);
      alert('Failed to save driver');
    } finally {
      setSavingDriver(false);
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
    <div className="mx-auto max-w-7xl p-4 md:p-8 relative">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-primary">Driver Management</h1>
          <p className="mt-2 text-text-light">
            Monitor your fleet, track deliveries, and toggle driver availability.
          </p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-button text-sm font-bold text-white transition-colors hover:bg-primary-light whitespace-nowrap"
        >
          <Plus className="h-5 w-5" />
          Add New Driver
        </button>
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
              className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-center overflow-hidden rounded-2xl border ${driver.is_active ? 'border-border' : 'border-border/50 opacity-75'} bg-card p-5 shadow-sm hover:shadow-md transition-all`}
            >
              {/* Driver Info */}
              <div className="lg:col-span-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className={`relative h-16 w-16 shrink-0 rounded-full overflow-hidden border-2 shadow-sm ${driver.is_active ? 'border-border' : 'border-border/50 grayscale'}`}>
                  <Image src={driver.photo_url} alt={driver.name} fill className="object-cover" />
                </div>
                <div className="flex flex-col min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5 w-full">
                    <h3 className="font-heading text-lg font-bold text-text truncate max-w-[200px]">{driver.name}</h3>
                    {!driver.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                        Offline
                      </span>
                    ) : (() => {
                      const isReturning = driver.availability_status === 'Assigned' && driver.active_orders === 0;
                      return (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          driver.availability_status === 'Available' 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : isReturning
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {driver.availability_status === 'Available' ? <CheckCircle2 className="h-3 w-3" /> : isReturning ? <MapPin className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                          {isReturning ? 'Returning' : driver.availability_status}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-text-light w-full mt-0.5">
                    <span className="whitespace-nowrap flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-text-muted" />
                      {driver.mobile_number}
                    </span>
                    <span className="hidden sm:inline h-1.5 w-1.5 rounded-full bg-border shrink-0"></span>
                    <span className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-bold border whitespace-nowrap shrink-0 ${driver.is_active ? 'bg-accent/10 text-accent border-accent/20' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                      {driver.vehicle_number}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Stats */}
              <div className="lg:col-span-3 flex items-center justify-around border-y lg:border-y-0 lg:border-x border-border py-4 lg:py-0 h-full">
                <div className="flex flex-col items-center justify-center flex-1 min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1 flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Total
                  </span>
                  <span className="font-heading text-xl sm:text-2xl font-bold text-text">{driver.delivered_orders}</span>
                </div>
                <div className="h-10 w-px bg-border shrink-0"></div>
                <div className="flex flex-col items-center justify-center flex-1 min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1 flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <Clock className="h-3.5 w-3.5 shrink-0" /> On The Way
                  </span>
                  <span className={`font-heading text-xl sm:text-2xl font-bold ${driver.active_orders > 0 ? 'text-accent' : 'text-text'}`}>{driver.active_orders}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="lg:col-span-4 flex flex-wrap items-center justify-start lg:justify-end gap-3 w-full">
                <div className="flex items-center gap-3 w-full sm:w-auto bg-accent/5 px-4 py-2.5 rounded-xl border border-accent/10">
                  <span className={`text-xs font-bold uppercase tracking-wider ${driver.is_active ? 'text-green-600' : 'text-text-muted'}`}>
                    {driver.is_active ? 'Online' : 'Offline'}
                  </span>
                  <button
                    onClick={() => toggleDriverStatus(driver.id, driver.is_active)}
                    disabled={togglingId === driver.id}
                    className="relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none disabled:opacity-50 shadow-sm hover:shadow-md"
                  >
                    <span className={`absolute inset-0 h-full w-full rounded-full transition-all duration-300 ease-in-out ${driver.is_active ? 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-inner shadow-green-700/20' : 'bg-slate-200 shadow-inner shadow-slate-300/50'}`} />
                    <span
                      className={`absolute flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${
                        driver.is_active ? 'translate-x-3.5' : '-translate-x-3.5'
                      }`}
                    >
                      {togglingId === driver.id ? (
                        <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                      ) : driver.is_active ? (
                        <Power className="h-3 w-3 text-green-500" />
                      ) : (
                        <Power className="h-3 w-3 text-slate-300" />
                      )}
                    </span>
                  </button>
                </div>
                
                <div className="flex flex-1 sm:flex-none justify-end gap-3">
                  {driver.availability_status === 'Assigned' && driver.active_orders === 0 && driver.is_active && (
                    <button
                      onClick={() => markDriverArrived(driver.id)}
                      disabled={togglingId === driver.id}
                      className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200"
                    >
                      {togglingId === driver.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                      Mark Arrived
                    </button>
                  )}
                  <button
                    onClick={() => setViewingDriver({ id: driver.id, name: driver.name })}
                    className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                  >
                    <Package className="h-4 w-4" />
                    History
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Driver Modal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setShowAddForm(false)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-card shadow-2xl border border-border flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-border p-6 bg-background/50">
                <h2 className="font-heading text-xl font-bold text-primary">Add New Driver</h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="rounded-full p-2 text-text-light transition-colors hover:bg-border/50 hover:text-text"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 block">Driver Name *</label>
                      <input 
                        type="text" 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 block">Mobile Number *</label>
                      <input 
                        type="text" 
                        value={newMobile} 
                        onChange={e => setNewMobile(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="+91 9876543210"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 block">Vehicle Number *</label>
                      <input 
                        type="text" 
                        value={newVehicle} 
                        onChange={e => setNewVehicle(e.target.value.toUpperCase())}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="TS 09 AB 1234"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 block">Driver Photo *</label>
                    <div className="relative flex-1 flex flex-col items-center justify-center min-h-[200px] rounded-xl border-2 border-dashed border-border bg-background hover:bg-border/30 transition-colors group overflow-hidden">
                      {newPhotoPreview ? (
                        <>
                          <Image src={newPhotoPreview} alt="Preview" fill className="object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white font-medium text-sm">Change Photo</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center mb-3">
                            <Upload className="h-6 w-6 text-accent" />
                          </div>
                          <span className="text-sm font-medium text-text-light group-hover:text-primary transition-colors">Click to upload photo</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border">
                  <button 
                    onClick={() => setShowAddForm(false)}
                    disabled={savingDriver}
                    className="rounded-xl px-6 py-3 font-button text-sm font-bold text-text-light transition-colors hover:bg-border"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveNewDriver}
                    disabled={savingDriver}
                    className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-button text-sm font-bold text-white transition-colors hover:bg-primary-light disabled:opacity-70"
                  >
                    {savingDriver ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                    Save Driver
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Driver History Modal */}
      <AnimatePresence>
        {viewingDriver && (
          <DriverHistoryModal
            driverId={viewingDriver.id}
            driverName={viewingDriver.name}
            onClose={() => setViewingDriver(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
