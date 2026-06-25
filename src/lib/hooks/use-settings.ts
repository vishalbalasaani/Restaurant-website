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
    const supabase = createClient();
    
    const fetchSettings = async () => {
      try {
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

    const channel = supabase
      .channel('public:restaurant_settings')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'restaurant_settings' },
        (payload: any) => {
          setSettings(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { settings, loading };
}
