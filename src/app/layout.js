import './globals.css';
import PwaRegister from '@/components/PwaRegister';

export const viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata = {
  title: 'NFSTI Equipment & Property Inventory Management System',
  description: 'Government Property Accountability, Physical Inventory, Reconciliation and Automatic Office Equipment Reporting System',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NFSTI Property System',
  },
  icons: {
    icon: [
      { url: '/nfsti logo.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    shortcut: '/nfsti logo.png',
    apple: '/nfsti logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/nfsti logo.png" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/nfsti logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/nfsti logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="NFSTI Property System" />
      </head>
      <body className="antialiased selection:bg-emerald-500 selection:text-white">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
