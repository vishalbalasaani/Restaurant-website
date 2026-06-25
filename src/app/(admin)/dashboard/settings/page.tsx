'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, Clock, IndianRupee, Save, Phone, MapPin, Globe, CreditCard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RestaurantSettings } from '@/lib/types';
import { getEffectiveRestaurantStatus } from '@/lib/utils';

const TIME_SLOTS = Array.from({ length: 48 }).map((_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  const val = `${h.toString().padStart(2, '0')}:${m}`;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  const label = `${displayH.toString().padStart(2, '0')}:${m} ${ampm}`;
  return { val, label };
});

export default function SettingsPage() {
  const [settings, setSettings] = useState<Partial<RestaurantSettings>>({
    business_name: '',
    phone: '',
    whatsapp: '',
    instagram: '',
    address: '',
    opening_time: new Date().toISOString(),
    closing_time: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    kitchen_open: true,
    reservations_open: true,
    upi_id: '',
    bank_details: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.from('restaurant_settings').select('*').single();
        if (data) setSettings(data);
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();

    const supabase = createClient();
    const channel = supabase
      .channel('public:restaurant_settings:dashboard')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurant_settings' }, (payload) => {
        setSettings(payload.new as RestaurantSettings);
      })
      .subscribe();

    // Force re-render every second to keep effective status perfectly synced
    // with the physical passing of time without needing a page refresh.
    const interval = setInterval(() => {
      setTick(t => t + 1); 
    }, 1000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const supabase = createClient();
      const { id, updated_at, ...updateData } = settings as RestaurantSettings;
      
      // Sync the physical DB toggles with the current effective status
      // This ensures that if the DB auto-updates `updated_at`, it doesn't accidentally
      // lock in an "override" state that contradicts the schedule they just saved.
      const status = getEffectiveRestaurantStatus(settings);
      updateData.kitchen_open = status.isKitchenOpen;
      updateData.reservations_open = status.isReservationsOpen;

      await supabase
        .from('restaurant_settings')
        .update(updateData)
        .eq('id', id);
        
      // Update local state to match what we just saved
      setSettings((prev) => ({
        ...prev,
        kitchen_open: status.isKitchenOpen,
        reservations_open: status.isReservationsOpen,
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Handle error
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleKitchenToggle = async () => {
    if (!settings.id) return;
    const { isKitchenOpen } = getEffectiveRestaurantStatus(settings as any);
    const newValue = !isKitchenOpen;
    
    // Optimistic UI update
    setSettings((prev) => ({ ...prev, kitchen_open: newValue }));
    
    try {
      const supabase = createClient();
      await supabase
        .from('restaurant_settings')
        .update({ kitchen_open: newValue, updated_at: new Date().toISOString() })
        .eq('id', settings.id);
    } catch {
      // Revert if error occurs (optional, but good practice)
      setSettings((prev) => ({ ...prev, kitchen_open: !newValue }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-2xl space-y-6">
      {/* Kitchen Status Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-6 card-shadow ${getEffectiveRestaurantStatus(settings as any).isKitchenOpen ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-lg font-semibold text-primary">Kitchen Status</h3>
            <p className="text-sm text-text-light">
              {getEffectiveRestaurantStatus(settings as any).isKitchenOpen ? 'Kitchen is open — accepting orders' : 'Kitchen is closed — orders disabled'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleKitchenToggle}
            className={`relative h-8 w-14 rounded-full transition-colors ${getEffectiveRestaurantStatus(settings as any).isKitchenOpen ? 'bg-green-500' : 'bg-red-400'}`}
          >
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${getEffectiveRestaurantStatus(settings as any).isKitchenOpen ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </motion.div>

      {/* Reservations Status Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-6 card-shadow ${getEffectiveRestaurantStatus(settings as any).isReservationsOpen ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-lg font-semibold text-primary">Table Reservations</h3>
            <p className="text-sm text-text-light">
              {getEffectiveRestaurantStatus(settings as any).isReservationsOpen ? 'Reservations are open — customers can book tables' : 'Reservations are closed — bookings disabled'}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!settings.id) return;
              const { isReservationsOpen } = getEffectiveRestaurantStatus(settings as any);
              const newValue = !isReservationsOpen;
              setSettings((prev) => ({ ...prev, reservations_open: newValue }));
              try {
                const supabase = createClient();
                await supabase.from('restaurant_settings').update({ reservations_open: newValue, updated_at: new Date().toISOString() }).eq('id', settings.id);
              } catch {
                setSettings((prev) => ({ ...prev, reservations_open: !newValue }));
              }
            }}
            className={`relative h-8 w-14 rounded-full transition-colors ${getEffectiveRestaurantStatus(settings as any).isReservationsOpen ? 'bg-green-500' : 'bg-red-400'}`}
          >
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${getEffectiveRestaurantStatus(settings as any).isReservationsOpen ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </motion.div>

      {/* Business Info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-border bg-card p-6 card-shadow">
        <div className="mb-4 flex items-center gap-2">
          <Store className="h-5 w-5 text-accent" />
          <h3 className="font-heading text-lg font-semibold text-primary">Business Information</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="settingsBusinessName" className="mb-1.5 block text-sm font-medium text-text">Business Name</label>
            <input id="settingsBusinessName" type="text" value={settings.business_name || ''} onChange={(e) => handleChange('business_name', e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="settingsPhone" className="mb-1.5 block text-sm font-medium text-text">Phone Number</label>
              <input id="settingsPhone" type="text" value={settings.phone || ''} onChange={(e) => handleChange('phone', e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
            <div>
              <label htmlFor="settingsWhatsapp" className="mb-1.5 block text-sm font-medium text-text">WhatsApp Number</label>
              <input id="settingsWhatsapp" type="text" value={settings.whatsapp || ''} onChange={(e) => handleChange('whatsapp', e.target.value)} placeholder="919876543210" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
          </div>
          <div>
            <label htmlFor="settingsInstagram" className="mb-1.5 block text-sm font-medium text-text">Instagram Link</label>
            <input id="settingsInstagram" type="url" value={settings.instagram || ''} onChange={(e) => handleChange('instagram', e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div>
            <label htmlFor="settingsAddress" className="mb-1.5 block text-sm font-medium text-text">Address</label>
            <textarea id="settingsAddress" rows={2} value={settings.address || ''} onChange={(e) => handleChange('address', e.target.value)} className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
        </div>
      </motion.div>

      {/* Working Hours */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-6 card-shadow">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-accent" />
          <h3 className="font-heading text-lg font-semibold text-primary">Working Hours</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Opening Time</label>
            <div className="flex gap-2">
              <input 
                type="date" 
                value={settings.opening_time ? settings.opening_time.split('T')[0] : ''}
                onChange={(e) => {
                  const newDate = e.target.value;
                  const currentIso = settings.opening_time || new Date().toISOString();
                  const [_, timeStr] = currentIso.split('T');
                  // We store in local time ISO format to preserve the user's intent
                  handleChange('opening_time', `${newDate}T${timeStr}`);
                }}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" 
              />
              <select 
                value={settings.opening_time ? settings.opening_time.split('T')[1].substring(0, 5) : '11:00'}
                onChange={(e) => {
                  const newTime = e.target.value;
                  const currentIso = settings.opening_time || new Date().toISOString();
                  const [dateStr, _] = currentIso.split('T');
                  handleChange('opening_time', `${dateStr}T${newTime}:00`);
                }}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent appearance-none cursor-pointer"
              >
                {TIME_SLOTS.map(({ val, label }) => {
                  return <option key={val} value={val}>{label}</option>;
                })}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Closing Time</label>
            <div className="flex gap-2">
              <input 
                type="date" 
                value={settings.closing_time ? settings.closing_time.split('T')[0] : ''}
                onChange={(e) => {
                  const newDate = e.target.value;
                  const currentIso = settings.closing_time || new Date().toISOString();
                  const [_, timeStr] = currentIso.split('T');
                  handleChange('closing_time', `${newDate}T${timeStr}`);
                }}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" 
              />
              <select 
                value={settings.closing_time ? settings.closing_time.split('T')[1].substring(0, 5) : '23:00'}
                onChange={(e) => {
                  const newTime = e.target.value;
                  const currentIso = settings.closing_time || new Date().toISOString();
                  const [dateStr, _] = currentIso.split('T');
                  handleChange('closing_time', `${dateStr}T${newTime}:00`);
                }}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent appearance-none cursor-pointer"
              >
                {TIME_SLOTS.map(({ val, label }) => {
                  // Filter out past times if it's today
                  const now = new Date();
                  const isToday = settings.closing_time && settings.closing_time.split('T')[0] === now.toISOString().split('T')[0];
                  const currentH = now.getHours();
                  const currentM = now.getMinutes();
                  const [slotH, slotM] = val.split(':').map(Number);
                  const isPast = isToday && (slotH < currentH || (slotH === currentH && slotM < currentM));
                  if (isPast) return null;
                  return <option key={val} value={val}>{label}</option>;
                })}
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Payment Info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-border bg-card p-6 card-shadow">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-accent" />
          <h3 className="font-heading text-lg font-semibold text-primary">Payment Information</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="settingsUpiId" className="mb-1.5 block text-sm font-medium text-text">UPI ID</label>
            <input id="settingsUpiId" type="text" value={settings.upi_id || ''} onChange={(e) => handleChange('upi_id', e.target.value)} placeholder="yourbusiness@upi" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div>
            <label htmlFor="settingsBankDetails" className="mb-1.5 block text-sm font-medium text-text">Bank Details</label>
            <textarea id="settingsBankDetails" rows={2} value={settings.bank_details || ''} onChange={(e) => handleChange('bank_details', e.target.value)} placeholder="Bank Name | Account No. | IFSC Code" className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
        </div>
      </motion.div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4">
        {saved && (
          <motion.span initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="text-sm font-medium text-green-600">
            ✓ Settings saved
          </motion.span>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-button text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-50"
        >
          {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-4 w-4" />}
          Save Settings
        </button>
      </div>
    </form>
  );
}
