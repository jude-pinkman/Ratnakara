import type { Metadata } from 'next';
import { Manrope, Fraunces } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
});

export const metadata: Metadata = {
  title: 'Marine Data Platform',
  description: 'AI-Driven Unified Marine Data Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${fraunces.variable}`}>
        <Navigation />
        <main className="lg:ml-72 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
