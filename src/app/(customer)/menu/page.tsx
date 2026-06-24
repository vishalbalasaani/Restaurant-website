import type { Metadata } from 'next';
import MenuSection from '@/components/customer/menu-section';
import Hero from '@/components/customer/hero';

export const metadata: Metadata = {
  title: 'Menu — Flavour House',
  description: 'Browse our full menu of authentic, freshly prepared dishes. Order online for delivery.',
};

export default function MenuPage() {
  return (
    <>
      <Hero />
      <div className="pt-8">
        <MenuSection />
      </div>
    </>
  );
}
