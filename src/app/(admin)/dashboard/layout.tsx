'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Settings,
  BarChart3,
  LogOut,
  ChefHat,
  Menu,
  X,
  Truck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RestaurantSettings } from '@/lib/types';
import { playBuzzer } from '@/lib/utils';
const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Live Orders', href: '/dashboard/notifications', icon: ChefHat },
  { label: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
  { label: 'Menu', href: '/dashboard/menu', icon: UtensilsCrossed },
  { label: 'Drivers', href: '/dashboard/drivers', icon: Truck },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

function Sidebar({
  pathname,
  setSidebarOpen,
  handleLogout,
}: {
  pathname: string;
  setSidebarOpen: (val: boolean) => void;
  handleLogout: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-primary text-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6 md:h-20">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
          <ChefHat className="h-4 w-4 text-accent" />
        </div>
        <span className="font-heading text-lg font-bold">Flavour House</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-accent/20 text-accent'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/60 transition-all hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settings, setSettings] = useState<Partial<RestaurantSettings>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.from('restaurant_settings').select('*').single();
        if (data) setSettings(data);
      } catch {
        // ignore
      }
    };
    fetchSettings();

    const supabase = createClient();
    const channel = supabase
      .channel('global-admin-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            playBuzzer();
            router.push('/dashboard/notifications');
          } else if (payload.eventType === 'UPDATE') {
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             const newStatus = (payload.new as any).status;
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             const oldStatus = (payload.old as any).status;
             if (newStatus === 'cancellation_requested' && oldStatus !== 'cancellation_requested') {
               playBuzzer();
               router.push('/dashboard/notifications');
             }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 md:block">
        <Sidebar pathname={pathname} setSidebarOpen={setSidebarOpen} handleLogout={handleLogout} />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64">
            <Sidebar pathname={pathname} setSidebarOpen={setSidebarOpen} handleLogout={handleLogout} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-text-light hover:bg-background md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden md:block">
            <h2 className="font-heading text-lg font-semibold text-primary">
              {NAV_ITEMS.find((item) => item.href === pathname)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="relative">
            <button 
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 border border-accent/20">
                <span className="font-heading text-sm font-bold text-accent">
                  {settings.business_name ? settings.business_name.charAt(0).toUpperCase() : 'A'}
                </span>
              </div>
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-border bg-card p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="mb-2 p-3 pb-4 border-b border-border">
                    <p className="font-heading text-base font-bold text-primary">{settings.business_name || 'Admin User'}</p>
                    <p className="text-sm font-medium text-text mt-1">{settings.phone || 'No phone set'}</p>
                    <p className="text-xs text-text-light mt-2 line-clamp-2 leading-relaxed">{settings.address || 'No address set'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
