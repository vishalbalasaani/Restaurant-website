import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useKitchenStatus() {
  const [kitchenOpen, setKitchenOpen] = useState(true);
  const [openingTime, setOpeningTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    const fetchStatus = async () => {
      try {
        const { data } = await supabase.from('restaurant_settings').select('kitchen_open, opening_time').single();
        if (data) {
          setKitchenOpen(data.kitchen_open);
          setOpeningTime(data.opening_time);
        }
      } catch (e) {
        // fail silently
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatus();

    const channel = supabase
      .channel(`kitchen_status_${Math.random()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'restaurant_settings' },
        (payload) => {
          if (payload.new) {
            if (typeof payload.new.kitchen_open !== 'undefined') {
              setKitchenOpen(payload.new.kitchen_open);
            }
            if (typeof payload.new.opening_time !== 'undefined') {
              setOpeningTime(payload.new.opening_time);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { kitchenOpen, openingTime, loading };
}
