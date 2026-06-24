'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/customer/navbar';
import Footer from '@/components/customer/footer';

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
      <main className="min-h-screen">{children}</main>
      {!isAuthPage && <Footer />}
    </>
  );
}
