import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RestaurantSettings } from '@/lib/types';

const defaultSettings: Partial<RestaurantSettings> = {
  business_name: 'Flavour House',
  phone: '+91 98765 43210',
  whatsapp: '919876543210',
  instagram: 'https://instagram.com/flavourhouse',
  address: '42, Spice Lane, Jubilee Hills, Hyderabad — 500033',
  opening_time: '11:00',
  closing_time: '23:00',
  kitchen_open: true,
};

export function useSettings() {
  const [settings, setSettings] = useState<Partial<RestaurantSettings>>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.from('restaurant_settings').select('*').single();
        if (data) {
          setSettings(data);
        }
      } catch (e) {
        // fallback to defaults
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  return { settings, loading };
}
