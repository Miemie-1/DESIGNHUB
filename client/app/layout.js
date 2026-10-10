import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import './screens.css';

export const metadata = {
  title: 'DesignHub',
  description: 'Graphic design project, client and payment management system',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // lets the bottom tab bar respect the iPhone home-indicator inset
};

// Same font pairing as the someScheme client: Fraunces for display/headings, Inter for UI text.
const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-fraunces',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Runs before first paint so the saved (or system) theme never flashes the wrong colours.
const themeScript = `(function(){try{var p=localStorage.getItem('designhub_theme');var d=p?p==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
