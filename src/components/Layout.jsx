import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header.jsx';

export default function Layout() {
  const location = useLocation();
  const [savedCount, setSavedCount] = React.useState(0);

  // Sync saved count from localStorage
  React.useEffect(() => {
    function syncSavedCount() {
      try {
        const saved = JSON.parse(localStorage.getItem('ingredia_saved') || '[]');
        setSavedCount(saved.length);
      } catch (e) {
        console.warn('Failed to read saved recipes:', e);
      }
    }
    syncSavedCount();
    window.addEventListener('storage', syncSavedCount);
    const interval = setInterval(syncSavedCount, 1000);
    return () => {
      window.removeEventListener('storage', syncSavedCount);
      clearInterval(interval);
    };
  }, []);

  // Theme Sync Engine
  React.useEffect(() => {
    function applyTheme() {
      const storedTheme = localStorage.getItem('ingredia_theme') || 'light';
      let activeTheme = storedTheme;
      
      if (storedTheme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        activeTheme = systemPrefersDark ? 'dark' : 'light';
      }
      
      if (activeTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
    applyTheme();
    const interval = setInterval(applyTheme, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout-shell">
      <Header savedCount={savedCount} />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="page-transition-wrapper"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
