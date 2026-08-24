import './globals.css';

export const metadata = {
  title: 'NFSTI Equipment & Property Inventory Management System',
  description: 'Government Property Accountability, Physical Inventory, Reconciliation and Automatic Office Equipment Reporting System',
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
        <link rel="icon" href="/nfsti logo.png" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/nfsti logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/nfsti logo.png" />
      </head>
      <body className="antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
