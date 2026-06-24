import Hero from '@/components/customer/hero';
import MenuSection from '@/components/customer/menu-section';

export default function HomePage() {
  return (
    <>
      <Hero />
      <div className="pt-8">
        <MenuSection />
      </div>
    </>
  );
}
