import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flavour House — Premium Restaurant Ordering',
  description:
    'Order fresh, authentic cuisine from Flavour House. Browse our menu, place orders online, and track delivery in real-time.',
  keywords: ['restaurant', 'food ordering', 'online order', 'delivery', 'Flavour House'],
  openGraph: {
    title: 'Flavour House — Premium Restaurant Ordering',
    description: 'Fresh, authentic flavours delivered to your doorstep.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background font-body text-text antialiased">
        {children}
      </body>
    </html>
  );
}
