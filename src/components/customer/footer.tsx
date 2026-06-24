'use client';

import Link from 'next/link';
import { ChefHat, Phone, MapPin, Clock, AtSign } from 'lucide-react';
import { useSettings } from '@/lib/hooks/use-settings';

export default function Footer() {
  const { settings } = useSettings();
  
  return (
    <footer className="border-t border-border bg-primary text-white/80">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20">
                <ChefHat className="h-5 w-5 text-accent" />
              </div>
              <span className="font-heading text-xl font-bold text-white">
                Flavour House
              </span>
            </div>
            <p className="font-body text-sm leading-relaxed text-white/50">
              Premium dining experience with authentic flavours,
              delivered fresh to your doorstep.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-white">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Menu', href: '/menu' },
                { label: 'Track Order', href: '/track' },
                { label: 'Contact', href: '/contact' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-body text-sm text-white/50 transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-white">
              Contact Us
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                <span className="font-body text-sm text-white/50">{settings?.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-accent" />
                <span className="font-body text-sm text-white/50">{settings?.phone}</span>
              </li>
              <li className="flex items-start gap-2">
                <AtSign className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                <a
                  href="https://instagram.com/flavourhouse"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-sm text-white/50 transition-colors hover:text-accent"
                >
                  @flavourhouse
                </a>
              </li>
            </ul>
          </div>

          {/* Working Hours */}
          <div>
            <h4 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-white">
              Working Hours
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                <div>
                  <p className="font-body text-sm text-white/50">Monday — Sunday</p>
                  <p className="font-body text-sm font-medium text-white/70">11:00 AM — 11:00 PM</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-white/10 pt-8 text-center">
          <p className="font-body text-xs text-white/30">
            © {new Date().getFullYear()} Flavour House. All rights reserved. Built with ❤️
          </p>
        </div>
      </div>
    </footer>
  );
}
