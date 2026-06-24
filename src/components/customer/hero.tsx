'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, UtensilsCrossed } from 'lucide-react';

export default function Hero() {
  return (
    <section id="hero" className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat lg:bg-fixed"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&h=1080&fit=crop')`,
        }}
      />

      {/* Gradient Overlays for better text legibility */}
      <div className="absolute inset-0 bg-black/60" />
      <div className="gradient-hero absolute inset-0 mix-blend-multiply" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
            <UtensilsCrossed className="h-4 w-4 text-accent" />
            <span className="font-body text-sm font-medium text-white/80">
              Premium Dining Experience
            </span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-6 font-heading text-5xl font-bold leading-tight tracking-tight text-white drop-shadow-xl md:text-7xl"
        >
          Authentic Flavours,{' '}
          <span className="text-gradient drop-shadow-lg">Delivered Fresh</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mx-auto mb-10 max-w-xl font-body text-lg font-medium text-white/90 drop-shadow-lg"
        >
          Handcrafted dishes made with the finest ingredients,
          delivered straight to your doorstep.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="/menu"
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-8 py-4 font-button text-base font-bold text-primary transition-all hover:bg-accent-light hover:shadow-lg hover:shadow-accent/20 sm:w-auto"
          >
            Order Now
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#menu"
            className="w-full rounded-xl border border-white/20 bg-white/5 px-8 py-4 font-button text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10 sm:w-auto"
          >
            View Menu
          </a>
        </motion.div>

      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
