'use client';

import { useEffect, useState } from 'react';
import { applyTheme } from '@/lib/theme';
import { MoonIcon, SunIcon } from './Icons';

// Quick light/dark switch. The icon swap is driven purely by <html data-theme>,
// so it is correct on first paint; state is only used for the accessible label.
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.dataset.theme === 'dark');
  }, []);

  const toggle = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setDark(next === 'dark');
  };

  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button type="button" className="icon-btn theme-swap" onClick={toggle} aria-label={label} title={label}>
      <SunIcon className="sun" />
      <MoonIcon className="moon" />
    </button>
  );
}
