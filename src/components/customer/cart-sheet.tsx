'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart-store';
import { formatPrice } from '@/lib/utils';
import { useKitchenStatus } from '@/lib/hooks/use-kitchen-status';

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSheet({ isOpen, onClose }: CartSheetProps) {
  const { items, updateQuantity, removeItem, getTotalAmount } = useCartStore();
  const total = getTotalAmount();
  const { kitchenOpen } = useKitchenStatus();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <h2 className="font-heading text-xl font-bold text-primary">
                  Your Cart
                </h2>
                <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-text-light transition-colors hover:bg-background hover:text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <ShoppingBag className="mb-4 h-16 w-16 text-border" />
                  <p className="mb-2 font-heading text-lg font-semibold text-text">
                    Your cart is empty
                  </p>
                  <p className="text-sm text-text-light">
                    Add items from the menu to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <motion.div
                      key={item.product_id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex gap-4 rounded-xl border border-border p-3"
                    >
                      {/* Image */}
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="mb-0.5 flex items-center gap-1.5">
                                <div className={item.is_veg ? 'veg-indicator' : 'nonveg-indicator'} style={{ width: 12, height: 12 }} />
                                <h4 className="font-heading text-sm font-semibold text-text line-clamp-1">
                                  {item.name}
                                </h4>
                              </div>
                              <p className="text-sm font-medium text-accent">
                                {formatPrice(item.price)}
                              </p>
                            </div>
                            <button
                              onClick={() => removeItem(item.product_id)}
                              className="rounded-md p-1 text-text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                              disabled={!kitchenOpen}
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-light transition-colors hover:border-accent hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center font-heading text-sm font-bold">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                              disabled={!kitchenOpen}
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white transition-colors hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="font-heading text-sm font-bold text-primary">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-border px-6 py-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-body text-sm text-text-light">Subtotal</span>
                  <span className="font-heading text-xl font-bold text-primary">
                    {formatPrice(total)}
                  </span>
                </div>
                <Link
                  href={kitchenOpen ? "/cart" : "#"}
                  onClick={kitchenOpen ? onClose : (e) => e.preventDefault()}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 font-button text-base font-semibold text-white transition-all duration-300 ${kitchenOpen ? "bg-primary hover:bg-primary-light hover:shadow-lg" : "bg-text-muted cursor-not-allowed opacity-50"}`}
                >
                  {kitchenOpen ? "Proceed to Checkout" : "Kitchen Closed"}
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
