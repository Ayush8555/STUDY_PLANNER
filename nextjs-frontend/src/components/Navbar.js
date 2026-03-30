'use client';

import { PlayCircle, Moon, Sun } from '@phosphor-icons/react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const Navbar = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 w-full bg-bg/80 backdrop-blur-md z-50 border-b border-gray-200/50">
      <div className="container flex items-center justify-between h-[72px]">
        <Link href="/" className="flex items-center gap-2 text-xl text-text-dark">
          <div className="flex items-center justify-center text-primary text-2xl">
            <PlayCircle weight="fill" />
          </div>
          <span className="font-semibold tracking-tight">
            PrepMind <strong className="font-extrabold text-primary">AI</strong>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-[15px] font-medium text-text-muted hover:text-primary transition-colors">Features</a>
          <a href="#how-it-works" className="text-[15px] font-medium text-text-muted hover:text-primary transition-colors">How It Works</a>
          <a href="#pricing" className="text-[15px] font-medium text-text-muted hover:text-primary transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-6">
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center justify-center text-xl text-text-muted hover:text-primary transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun /> : <Moon />}
            </button>
          )}
          <Link href="/login" className="hidden sm:block text-[15px] font-semibold text-primary hover:text-primary-hover transition-colors">Login</Link>
          <Link href="/login" className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-[15px] font-semibold text-white bg-primary hover:bg-primary-hover shadow-md shadow-primary/20 transition-all hover:-translate-y-[1px]">
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
