import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TopoSonics - Turn Images into Music',
  description:
    'Transform static photos or live camera input into rich musical landscapes. Map visual features to pitch, time, and effects.',
  keywords: ['generative music', 'image to audio', 'sonification', 'creative tools'],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TopoSonics',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} font-sans`}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <header className="border-b border-gray-800 bg-surface-primary">
              <nav className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <Link href="/" className="text-2xl font-bold text-primary-400">
                    🎵 TopoSonics
                  </Link>
                  <div className="flex gap-6">
                    <Link
                      href="/studio"
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      Studio
                    </Link>
                    <Link
                      href="/compositions"
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      Compositions
                    </Link>
                  </div>
                </div>
              </nav>
            </header>
            <main className="flex-1">{children}</main>
            <footer className="border-t border-gray-800 bg-surface-primary py-6">
              <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
                TopoSonics &copy; 2024 - Turn images into soundscapes
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
