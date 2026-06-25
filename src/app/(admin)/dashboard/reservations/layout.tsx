'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ReservationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Reservations', href: '/dashboard/reservations/list' },
    { name: 'Tables', href: '/dashboard/reservations/tables' },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card px-8 py-6">
        <h1 className="font-heading text-3xl font-bold text-text">Table Reservation</h1>
        <p className="mt-2 text-text-light">Manage your restaurant tables and reservations.</p>
        
        <div className="mt-6 flex space-x-6">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`border-b-2 pb-3 text-sm font-bold transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-light hover:text-text'
                }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-8">
        {children}
      </div>
    </div>
  );
}
