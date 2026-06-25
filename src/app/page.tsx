'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { UtensilsCrossed, ShieldCheck, ChefHat, ArrowRight } from 'lucide-react';
import CountdownBanner from '@/components/customer/countdown-banner';

export default function StartPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-primary">
      <div className="absolute top-0 left-0 right-0 z-50">
        <CountdownBanner />
      </div>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(212, 163, 115, 0.3) 2px, transparent 0)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Ambient Glow */}
      <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-secondary/10 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-lg px-6 text-center">
        {/* Logo / Brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-4"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/20 backdrop-blur-sm">
            <ChefHat className="h-10 w-10 text-accent" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-3 font-heading text-5xl font-bold tracking-tight text-white md:text-6xl"
        >
          Flavour House
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12 font-body text-lg text-white/60"
        >
          Premium dining, delivered fresh
        </motion.p>

        {/* Role Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="space-y-4"
        >
          {/* Customer Button */}
          <Link href="/menu" className="group block">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-8 py-5 backdrop-blur-sm transition-all duration-300 hover:border-accent/30 hover:bg-white/10">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20">
                  <UtensilsCrossed className="h-6 w-6 text-accent" />
                </div>
                <div className="text-left">
                  <p className="font-heading text-lg font-semibold text-white">
                    Continue as Customer
                  </p>
                  <p className="text-sm text-white/50">
                    Browse menu & place orders
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-white/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-accent" />
            </div>
          </Link>

          {/* Admin Button */}
          <Link href="/login" className="group block">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-8 py-5 backdrop-blur-sm transition-all duration-300 hover:border-accent/30 hover:bg-white/10">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/20">
                  <ShieldCheck className="h-6 w-6 text-secondary-light" />
                </div>
                <div className="text-left">
                  <p className="font-heading text-lg font-semibold text-white">
                    Continue as Admin
                  </p>
                  <p className="text-sm text-white/50">
                    Manage restaurant & orders
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-white/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-accent" />
            </div>
          </Link>
        </motion.div>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 text-xs text-white/30"
        >
          ┬⌐ {new Date().getFullYear()} Flavour House. All rights reserved.
        </motion.p>
      </div>
    </div>
  );
}
