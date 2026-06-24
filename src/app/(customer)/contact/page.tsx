import type { Metadata } from 'next';
import { Phone, MapPin, Clock, AtSign, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Contact — Flavour House',
  description: 'Get in touch with Flavour House. Find our address, phone number, and working hours.',
};

export default async function ContactPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from('restaurant_settings').select('*').single();

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-4 md:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <span className="mb-3 inline-block font-body text-sm font-semibold uppercase tracking-wider text-accent">
            Get in Touch
          </span>
          <h1 className="mb-4 font-heading text-4xl font-bold text-primary md:text-5xl">
            Contact Us
          </h1>
          <p className="mx-auto max-w-md font-body text-text-light">
            We&apos;d love to hear from you. Reach out to us for orders,
            feedback, or catering inquiries.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Phone */}
          <div className="rounded-2xl border border-border bg-card p-8 text-center card-shadow">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
              <Phone className="h-6 w-6 text-accent" />
            </div>
            <h3 className="mb-2 font-heading text-xl font-bold text-primary">Call Us</h3>
            <p className="mb-4 text-sm text-text-light">For reservations and support</p>
            <a href={`tel:${settings?.phone || '+91 98765 43210'}`} className="font-heading text-lg font-bold text-accent transition-colors hover:text-secondary">
              {settings?.phone || '+91 98765 43210'}
            </a>
          </div>

          {/* WhatsApp */}
          <div className="rounded-2xl border border-border bg-card p-8 text-center card-shadow">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <MessageCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="mb-2 font-heading text-xl font-bold text-primary">WhatsApp</h3>
            <p className="mb-4 text-sm text-text-light">Quick replies within minutes</p>
            <a 
              href={`https://wa.me/${settings?.whatsapp || '919876543210'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-green-600 px-6 py-2.5 font-button text-sm font-semibold text-white transition-colors hover:bg-green-700"
            >
              Message Us
            </a>
          </div>

          {/* Location & Hours */}
          <div className="rounded-2xl border border-border bg-card p-8 card-shadow">
            <MapPin className="mb-4 h-8 w-8 text-accent" />
            <h3 className="mb-2 font-heading text-xl font-bold text-primary">Location</h3>
            <p className="text-text-light">
              {settings?.address || '42, Spice Lane, Jubilee Hills, Hyderabad — 500033'}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8 card-shadow">
            <Clock className="mb-4 h-8 w-8 text-accent" />
            <h3 className="mb-2 font-heading text-xl font-bold text-primary">Working Hours</h3>
            <p className="text-text-light">
              Open Daily<br />
              {settings?.opening_time || '11:00'} to {settings?.closing_time || '23:00'}
            </p>
          </div>
        </div>

        {/* Instagram CTA */}
        <div className="mt-10 rounded-2xl border border-border bg-gradient-to-r from-primary to-secondary p-8 text-center text-white md:p-12">
          <AtSign className="mx-auto mb-4 h-10 w-10 text-accent" />
          <h3 className="mb-2 font-heading text-2xl font-bold">Follow Us on Instagram</h3>
          <p className="mb-6 text-sm text-white/60">Stay updated with our latest dishes and offers.</p>
          <a
            href={settings?.instagram || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 font-button text-sm font-semibold text-primary transition-all hover:shadow-lg"
          >
            <AtSign className="h-4 w-4" />
            @flavourhouse
          </a>
        </div>
      </div>
    </div>
  );
}
