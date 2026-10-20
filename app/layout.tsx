import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Folio — A space for good work',
  description: 'A thoughtful workspace for documents and shared ideas.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
