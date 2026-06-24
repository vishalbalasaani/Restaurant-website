'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ShoppingBag, ChefHat } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart-store';
import { NAV_LINKS } from '@/lib/constants';
import CartSheet from './cart-sheet';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const totalItems = useCartStore((s) => s.getTotalItems());

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 shadow-sm backdrop-blur-md'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:h-20 md:px-8">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isScrolled ? 'bg-primary' : 'bg-white/10 backdrop-blur-sm'}`}>
              <ChefHat className={`h-5 w-5 ${isScrolled ? 'text-accent' : 'text-white'}`} />
            </div>
            <span className={`font-heading text-xl font-bold ${isScrolled ? 'text-primary' : 'text-white'}`}>
              Flavour House
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-body text-sm font-medium transition-colors hover:text-accent ${
                  isScrolled ? 'text-text-light' : 'text-white/80 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className={`relative flex items-center gap-2 rounded-full px-5 py-2.5 font-button text-sm font-medium transition-all duration-300 ${
                isScrolled
                  ? 'bg-primary text-white hover:bg-primary-light'
                  : 'bg-white/10 text-white backdrop-blur-sm hover:bg-white/20'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              Cart
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-primary"
                >
                  {totalItems}
                </motion.span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setIsCartOpen(true)}
              className={`relative rounded-full p-2 ${isScrolled ? 'text-primary' : 'text-white'}`}
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-primary">
                  {totalItems}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`rounded-lg p-2 ${isScrolled ? 'text-primary' : 'text-white'}`}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-border/10 bg-white md:hidden"
            >
              <div className="space-y-1 px-4 py-4">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block rounded-lg px-4 py-3 font-body text-sm font-medium text-text-light transition-colors hover:bg-background hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Cart Sheet */}
      <CartSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
