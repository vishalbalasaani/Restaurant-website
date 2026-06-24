'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Store, Phone, MapPin, Clock, Globe, CreditCard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RestaurantSettings } from '@/lib/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Partial<RestaurantSettings>>({
    business_name: 'Flavour House',
    phone: '+91 98765 43210',
    whatsapp: '919876543210',
    instagram: 'https://instagram.com/flavourhouse',
    address: '42, Spice Lane, Jubilee Hills, Hyderabad — 500033',
    opening_time: '11:00',
    closing_time: '23:00',
    kitchen_open: true,
    upi_id: 'flavourhouse@upi',
    bank_details: 'HDFC Bank | A/C: 1234567890 | IFSC: HDFC0001234',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const supabase = createClient();
      const { id, ...updateData } = settings as RestaurantSettings;
      await supabase
        .from('restaurant_settings')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id);
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
    const newValue = !settings.kitchen_open;
    
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
        className={`rounded-2xl border p-6 card-shadow ${settings.kitchen_open ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-lg font-semibold text-primary">Kitchen Status</h3>
            <p className="text-sm text-text-light">
              {settings.kitchen_open ? 'Kitchen is open — accepting orders' : 'Kitchen is closed — orders disabled'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleKitchenToggle}
            className={`relative h-8 w-14 rounded-full transition-colors ${settings.kitchen_open ? 'bg-green-500' : 'bg-red-400'}`}
          >
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${settings.kitchen_open ? 'left-7' : 'left-1'}`} />
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
            <input id="settingsOpeningTime" type="time" value={settings.opening_time || '11:00'} onChange={(e) => handleChange('opening_time', e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div>
            <label htmlFor="settingsClosingTime" className="mb-1.5 block text-sm font-medium text-text">Closing Time</label>
            <input id="settingsClosingTime" type="time" value={settings.closing_time || '23:00'} onChange={(e) => handleChange('closing_time', e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
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
