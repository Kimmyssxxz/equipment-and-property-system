export default function manifest() {
  return {
    name: 'NFSTI Equipment & Property Inventory Management System',
    short_name: 'NFSTI Property',
    description: 'Government Property Accountability, Physical Inventory, Reconciliation and Automatic Office Equipment Reporting System',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#059669',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/nfsti logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
