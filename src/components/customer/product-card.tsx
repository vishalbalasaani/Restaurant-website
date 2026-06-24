'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Plus, Minus } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart-store';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/types';

interface ProductCardProps {
  product: Product;
  index: number;
  kitchenOpen: boolean;
}

export default function ProductCard({ product, index, kitchenOpen }: ProductCardProps) {
  const { items, addItem, updateQuantity, removeItem } = useCartStore();
  const cartItem = items.find((i) => i.product_id === product.id);
  const quantity = cartItem?.quantity || 0;

  const handleAdd = () => {
    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      is_veg: product.is_veg,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="group overflow-hidden rounded-2xl border border-border bg-card transition-shadow duration-300 card-shadow hover:card-shadow-hover"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={product.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />

        {/* Veg / Non-Veg Indicator */}
        <div className="absolute left-3 top-3">
          <div className={product.is_veg ? 'veg-indicator' : 'nonveg-indicator'} />
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-3 right-3">
          <span className="rounded-full bg-white/95 px-3 py-1.5 font-heading text-sm font-bold text-primary shadow-sm backdrop-blur-sm">
            {formatPrice(product.price)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="mb-1 font-heading text-lg font-semibold text-text line-clamp-1">
          {product.name}
        </h3>
        <p className="mb-4 font-body text-sm text-text-light line-clamp-2">
          {product.description}
        </p>

        {/* Add to Cart / Quantity Controls */}
        {quantity === 0 ? (
          <button
            onClick={handleAdd}
            disabled={!product.is_available || !kitchenOpen}
            className="w-full rounded-xl bg-primary px-4 py-3 font-button text-sm font-semibold text-white transition-all duration-300 hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!product.is_available ? 'Unavailable' : !kitchenOpen ? 'Kitchen Closed' : 'Add to Cart'}
          </button>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-accent bg-accent/5 px-2 py-1.5">
            <button
              onClick={() => updateQuantity(product.id, quantity - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-primary shadow-sm transition-colors hover:bg-accent hover:text-white"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="font-heading text-lg font-bold text-primary">
              {quantity}
            </span>
            <button
              onClick={() => updateQuantity(product.id, quantity + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-sm transition-colors hover:bg-primary-light"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
