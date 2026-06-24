'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { User, Phone, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function Onboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/signin');
        return;
      }

      setUserId(session.user.id);

      // Check if profile is already complete
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        // If they used Google, the trigger might have populated full_name
        if (profile.full_name) setFullName(profile.full_name);
        
        // If both are filled, skip onboarding
        if (profile.full_name && profile.mobile_number) {
          router.push('/home');
          return;
        }
      }
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    setSaving(true);
    const supabase = createClient();
    
    // Update profile
    await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        mobile_number: mobileNumber,
      })
      .eq('id', userId);

    router.push('/home');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-bold text-primary mb-2">Almost there!</h1>
          <p className="text-text-light">Let&apos;s complete your profile so we can deliver your orders.</p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8 card-shadow">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="John Doe"
                  className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  required
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={saving}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 font-button font-semibold text-primary transition-all hover:bg-accent-light hover:shadow-lg disabled:opacity-50"
            >
              {saving ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <>
                  Complete Profile
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
