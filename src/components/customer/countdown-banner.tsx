'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getEffectiveRestaurantStatus } from '@/lib/utils';
import { Clock } from 'lucide-react';
import type { RestaurantSettings } from '@/lib/types';

export default function CountdownBanner() {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [countdownStr, setCountdownStr] = useState<string | null>(null);
  const [openingStr, setOpeningStr] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('restaurant_settings')
      .select('*')
      .single()
      .then(({ data }) => {
        if (data) setSettings(data);
      });

    const channel = supabase
      .channel('public:restaurant_settings:banner')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurant_settings' }, (payload) => {
        setSettings(payload.new as RestaurantSettings);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const updateCountdown = () => {
      const status = getEffectiveRestaurantStatus(settings);
      setIsOpen(status.isOpen);

      if (status.isClosingSoon && status.closingTime) {
        const now = new Date();
        const diffMs = status.closingTime.getTime() - now.getTime();
        if (diffMs > 0) {
          const m = Math.floor(diffMs / 60000);
          const s = Math.floor((diffMs % 60000) / 1000);
          setCountdownStr(`${m}m ${s}s`);
        } else {
          setCountdownStr(null);
        }
      } else {
        setCountdownStr(null);
      }
      
      if (status.isOpeningSoon && status.openingTime) {
        const now = new Date();
        const diffMs = status.openingTime.getTime() - now.getTime();
        if (diffMs > 0) {
          const m = Math.floor(diffMs / 60000);
          const s = Math.floor((diffMs % 60000) / 1000);
          setOpeningStr(`${m}m ${s}s`);
        } else {
          setOpeningStr(null);
        }
      } else {
        setOpeningStr(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [settings]);

  if (isOpen && countdownStr) {
    return (
      <div className="bg-accent w-full text-white px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2">
        <Clock className="w-4 h-4 animate-pulse" />
        Restaurant will close in {countdownStr}
      </div>
    );
  }
  
  if (!isOpen && openingStr) {
    return (
      <div className="bg-blue-600 w-full text-white px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2">
        <Clock className="w-4 h-4 animate-pulse" />
        Restaurant opening in {openingStr}
      </div>
    );
  }
  
  if (settings && !isOpen) {
    return (
      <div className="bg-red-600/90 backdrop-blur-md w-full text-white px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2 border-b border-red-500/50">
        <Clock className="w-4 h-4" />
        Restaurant is now closed. We open tomorrow at 11:00 AM.
      </div>
    );
  }

  return null;
}
