'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/customer/navbar';
import Footer from '@/components/customer/footer';
import FloatingCart from '@/components/customer/floating-cart';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = ['/signin', '/signup', '/onboarding'].includes(pathname);

  return (
    <>
      {!isAuthPage && <Navbar />}
      {!isAuthPage && <FloatingCart />}
      <main className="min-h-screen">{children}</main>
      {!isAuthPage && <Footer />}
    </>
  );
}
