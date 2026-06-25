export const APP_NAME = 'Flavour House';
export const APP_DESCRIPTION = 'Premium restaurant ordering platform — fresh, authentic flavours delivered to your doorstep.';

export const CATEGORIES = [
  { name: 'All', slug: 'all' },
  { name: 'Veg', slug: 'veg' },
  { name: 'Non-Veg', slug: 'non-veg' },
  { name: 'Starters', slug: 'starters' },
  { name: 'Biryani', slug: 'biryani' },
  { name: 'Curries', slug: 'curries' },
  { name: 'Drinks', slug: 'drinks' },
  { name: 'Desserts', slug: 'desserts' },
] as const;

export const NAV_LINKS = [
  { label: 'Menu', href: '/menu' },
  { label: 'Table Reservation', href: '/reserve' },
  { label: 'Track Order', href: '/track' },
  { label: 'Contact', href: '/contact' },
] as const;

export const DEFAULT_SETTINGS: Record<string, string | boolean> = {
  business_name: 'Flavour House',
  phone: '+91 98765 43210',
  whatsapp: '919876543210',
  instagram: 'https://instagram.com/flavourhouse',
  address: '42, Spice Lane, Jubilee Hills, Hyderabad — 500033',
  opening_time: '11:00',
  closing_time: '23:00',
  kitchen_open: true,
  upi_id: 'flavourhouse@upi',
  bank_details: 'HDFC Bank | A/C: 1234567890 | IFSC: HDFC0001234',
};
