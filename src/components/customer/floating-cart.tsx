'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart-store';
import { formatPrice } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export default function FloatingCart() {
  const [mounted, setMounted] = useState(false);
  const { getTotalItems, getTotalAmount } = useCartStore();
  const totalItems = getTotalItems();
  const totalAmount = getTotalAmount();
  const pathname = usePathname();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Don't show on cart page, or if cart is empty
  if (!mounted || totalItems === 0 || pathname.includes('/cart')) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-12 left-4 right-4 z-[100] mx-auto max-w-lg md:bottom-8"
      >
        <Link href="/cart">
          <div className="flex items-center justify-between rounded-2xl bg-primary/95 backdrop-blur-lg border border-white/10 px-6 py-4 shadow-2xl shadow-black/50 transition-transform hover:-translate-y-1 active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent backdrop-blur-sm">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="text-left text-white">
                <p className="font-heading text-sm font-bold">
                  {totalItems} {totalItems === 1 ? 'Item' : 'Items'} added
                </p>
                <p className="text-xs font-medium text-white/80">
                  {formatPrice(totalAmount)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 font-button text-sm font-bold text-accent">
              View Cart
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
