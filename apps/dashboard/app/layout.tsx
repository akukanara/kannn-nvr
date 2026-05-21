import type { Metadata } from 'next';
import { MainLayout } from '@/components/layout/MainLayout';
import { Providers } from '@/providers/ChakraProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kannn NVR',
  description: 'Kannn Network Video Recorder Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <QueryProvider>
            <MainLayout>{children}</MainLayout>
          </QueryProvider>
        </Providers>
      </body>
    </html>
  );
}
