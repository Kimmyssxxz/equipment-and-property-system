import './globals.css';

export const metadata = {
  title: 'NFSTI Equipment & Property Inventory Management System',
  description: 'Government Property Accountability, Physical Inventory, Reconciliation and Automatic Office Equipment Reporting System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
