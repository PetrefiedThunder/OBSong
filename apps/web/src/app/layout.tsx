import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TopoSonics - Turn Images into Music',
  description:
    'Transform static photos or live camera input into rich musical landscapes. Map visual features to pitch, time, and effects.',
  keywords: ['generative music', 'image to audio', 'sonification', 'creative tools'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <header className="border-b border-gray-800 bg-surface-primary">
              <nav className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <a href="/" className="text-2xl font-bold text-primary-400">
                    🎵 TopoSonics
                  </a>
                  <div className="flex gap-6">
                    <a
                      href="/studio"
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      Studio
                    </a>
                    <a
                      href="/compositions"
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      Compositions
                    </a>
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
