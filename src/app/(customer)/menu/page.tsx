import type { Metadata } from 'next';
import MenuSection from '@/components/customer/menu-section';

export const metadata: Metadata = {
  title: 'Menu — Flavour House',
  description: 'Browse our full menu of authentic, freshly prepared dishes. Order online for delivery.',
};

export default function MenuPage() {
  return (
    <div className="pt-20">
      <MenuSection />
    </div>
  );
}
