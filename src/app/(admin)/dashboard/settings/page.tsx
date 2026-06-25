'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, Clock, IndianRupee, Save, Phone, MapPin, Globe, CreditCard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RestaurantSettings } from '@/lib/types';
import { getEffectiveRestaurantStatus } from '@/lib/utils';

function getNextDateForTime(timeStr: string, isCloseTime = false, openTimeStr = '11:00') {
  if (!timeStr) return '';
  const now = new Date();
  const [h, m] = timeStr.split(':').map(Number);
  const [openH, openM] = openTimeStr.split(':').map(Number);
  
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  
  if (isCloseTime) {
    if (h < openH || (h === openH && m < openM)) {
      d.setDate(d.getDate() + 1);
    }
  }
  
  // Format to YYYY-MM-DDThh:mm
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Partial<RestaurantSettings>>({
    business_name: '',
    phone: '',
    whatsapp: '',
    instagram: '',
    address: '',
    opening_time: '11:00',
    closing_time: '23:00',
    kitchen_open: true,
    reservations_open: true,
    upi_id: '',
    bank_details: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

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
      setCurrentTime(new Date()); 
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
            <label htmlFor="settingsOpeningTime" className="mb-1.5 block text-sm font-medium text-text">Opening Time</label>
            <input 
              id="settingsOpeningTime" 
              type="datetime-local" 
              step="1800"
              min={getNextDateForTime(`${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`)}
              value={getNextDateForTime(settings.opening_time || '11:00')} 
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                const timeStr = val.split('T')[1].substring(0, 5);
                handleChange('opening_time', timeStr);
              }} 
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" 
            />
          </div>
          <div>
            <label htmlFor="settingsClosingTime" className="mb-1.5 block text-sm font-medium text-text">Closing Time</label>
            <input 
              id="settingsClosingTime" 
              type="datetime-local" 
              step="1800"
              min={getNextDateForTime(`${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`)}
              value={getNextDateForTime(settings.closing_time || '23:00', true, settings.opening_time)} 
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                const timeStr = val.split('T')[1].substring(0, 5);
                handleChange('closing_time', timeStr);
              }} 
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" 
            />
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
