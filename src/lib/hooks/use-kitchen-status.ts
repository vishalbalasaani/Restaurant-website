import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getEffectiveRestaurantStatus } from '@/lib/utils';
import type { RestaurantSettings } from '@/lib/types';

export function useKitchenStatus() {
  const [kitchenOpen, setKitchenOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    const fetchStatus = async () => {
      try {
        const { data } = await supabase.from('restaurant_settings').select('*').single();
        if (data) {
          const { isKitchenOpen } = getEffectiveRestaurantStatus(data as RestaurantSettings);
          setKitchenOpen(isKitchenOpen);
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
            const { isKitchenOpen } = getEffectiveRestaurantStatus(payload.new as RestaurantSettings);
            setKitchenOpen(isKitchenOpen);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Also set up a timer to check effectively open status every minute
  // so it flips exactly when the time changes
  useEffect(() => {
    const interval = setInterval(() => {
       const supabase = createClient();
       supabase.from('restaurant_settings').select('*').single().then(({ data }) => {
          if (data) {
             const { isKitchenOpen } = getEffectiveRestaurantStatus(data as RestaurantSettings);
             setKitchenOpen(isKitchenOpen);
          }
       });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return { kitchenOpen, loading };
}
