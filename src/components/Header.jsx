import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Heart, History, Settings, Sun, Moon, Globe, User, Download, LogOut, LogIn, X } from 'lucide-react';
import { LANGUAGES } from '../i18n';
import { auth, signOut, onAuthStateChanged } from '../firebase';
import { clearAuthToken, getAuthToken } from '../utils/auth';

export default function Header({ savedCount = 0 }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [themeMode, setThemeMode] = React.useState(() => localStorage.getItem('ingredia_theme') || 'light');
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        // Fallback check: if token exists in localStorage
        const token = getAuthToken();
        if (token) {
          try {
            const decodedEmail = atob(token);
            if (decodedEmail && decodedEmail.includes('@')) {
              setCurrentUser({
                email: decodedEmail,
                displayName: decodedEmail.split('@')[0],
              });
              return;
            }
          } catch (e) {
            // invalid token format
          }
        }
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  async function handleSignOut() {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    clearAuthToken();
    setCurrentUser(null);
    setDrawerOpen(false);
    navigate('/auth');
  }

  function handleLogIn() {
    setDrawerOpen(false);
    navigate('/auth');
  }

  function handleLanguageChange(e) {
    const langCode = e.target.value;
    i18n.changeLanguage(langCode);
    localStorage.setItem('ingredia_lang', langCode);
  }

  const [deferredPrompt, setDeferredPrompt] = React.useState(null);

  React.useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  function handleInstallApp() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted PWA installation');
        }
        setDeferredPrompt(null);
      });
    } else {
      alert("Ingredia is ready to install! Click the Share icon or the browser's three-dot menu and select 'Add to Home Screen' or 'Install App'.");
    }
  }

  function toggleTheme() {
    const nextTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextTheme);
    localStorage.setItem('ingredia_theme', nextTheme);
  }

  const getUserInitials = () => {
    if (!currentUser) return 'GU';
    if (currentUser.displayName) {
      const parts = currentUser.displayName.split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return currentUser.displayName.slice(0, 2).toUpperCase();
    }
    if (currentUser.email) {
      return currentUser.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };


  return (
    <>
      {/* 1. TOP NAVBAR (For all devices, but links are hidden on mobile) */}
      <header className="navbar-glass">
        <div className="navbar-container">
          {/* Brand Logo */}
          <Link to="/" className="nav-brand" aria-label="Ingredia Home">
            <div className="brand-logo-mark">
              <svg width="32" height="32" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="64" height="64" rx="18" fill="url(#brand-logo-grad)"/>
                <rect x="22" y="24" width="10" height="24" rx="5" fill="#FFFFFF"/>
                <path d="M38 16C38 16 44 20 44 26C44 32 38 34 38 34C38 34 36 28 36 24C36 20 38 16 38 16Z" fill="#FFFFFF" fill-opacity="0.95"/>
                <circle cx="27" cy="18" r="4" fill="#F97316"/>
                <defs>
                  <linearGradient id="brand-logo-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#0F9D58"/>
                    <stop offset="1" stop-color="#0B8043"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="brand-text-box">
              <span className="brand-name">Ingredia</span>
              <span className="brand-pro-tag">{t('brandTag')}</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="nav-tabs-container desktop-nav-only" aria-label="Main Navigation">
            <NavLink 
              to="/" 
              end 
              className={({ isActive }) => `nav-item-btn ${isActive ? 'active' : ''}`}
            >
              <Home size={18} strokeWidth={2} />
              <span>{t('nav.home')}</span>
            </NavLink>

            <NavLink 
              to="/saved" 
              className={({ isActive }) => `nav-item-btn ${isActive ? 'active' : ''}`}
            >
              <Heart size={18} strokeWidth={2} />
              <span>{t('nav.saved')}</span>
              {savedCount > 0 && <span className="nav-badge-count">{savedCount}</span>}
            </NavLink>

            <NavLink 
              to="/history" 
              className={({ isActive }) => `nav-item-btn ${isActive ? 'active' : ''}`}
            >
              <History size={18} strokeWidth={2} />
              <span>{t('nav.history')}</span>
            </NavLink>

            <NavLink 
              to="/settings" 
              className={({ isActive }) => `nav-item-btn ${isActive ? 'active' : ''}`}
            >
              <Settings size={18} strokeWidth={2} />
              <span>{t('nav.settings')}</span>
            </NavLink>
          </nav>

          {/* Actions (Always Visible on all breakpoints) */}
          <div className="header-right-actions">
            <button 
              className="theme-toggle-btn" 
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              title="Toggle Theme"
            >
              {themeMode === 'light' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="lang-select-box-navbar">
              <Globe size={16} color="#6B7280" />
              <select 
                value={i18n.language || 'en'} 
                onChange={handleLanguageChange}
                className="lang-select-field"
                aria-label="Select Language"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.native}
                  </option>
                ))}
              </select>
            </div>

            {currentUser ? (
              <button 
                className="header-user-avatar-btn" 
                onClick={() => setDrawerOpen(true)}
                aria-label="User Account Drawer"
                title={currentUser.displayName || currentUser.email}
              >
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="User Avatar" className="header-avatar-img" />
                ) : (
                  <span className="header-initials-badge">{getUserInitials()}</span>
                )}
              </button>
            ) : (
              <button 
                className="header-login-btn"
                onClick={handleLogIn}
                aria-label="Log In or Sign Up"
              >
                <LogIn size={15} /> Log In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. MOBILE BOTTOM FLOATING NAVIGATION BAR (Visible <768px only) */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <NavLink 
          to="/" 
          end 
          className={({ isActive }) => `mobile-bottom-item ${isActive ? 'active' : ''}`}
        >
          <Home size={22} strokeWidth={2} />
          <span className="mobile-nav-text">{t('nav.home')}</span>
        </NavLink>

        <NavLink 
          to="/saved" 
          className={({ isActive }) => `mobile-bottom-item ${isActive ? 'active' : ''}`}
        >
          <div style={{ position: 'relative' }}>
            <Heart size={22} strokeWidth={2} />
            {savedCount > 0 && <span className="nav-badge-count mobile-badge">{savedCount}</span>}
          </div>
          <span className="mobile-nav-text">{t('nav.saved')}</span>
        </NavLink>

        <NavLink 
          to="/history" 
          className={({ isActive }) => `mobile-bottom-item ${isActive ? 'active' : ''}`}
        >
          <History size={22} strokeWidth={2} />
          <span className="mobile-nav-text">{t('nav.history')}</span>
        </NavLink>

        <NavLink 
          to="/settings" 
          className={({ isActive }) => `mobile-bottom-item ${isActive ? 'active' : ''}`}
        >
          <Settings size={22} strokeWidth={2} />
          <span className="mobile-nav-text">{t('nav.settings')}</span>
        </NavLink>
      </nav>

      {/* 3. PROFILE DRAWER */}
      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="side-drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top-profile">
              <div className="drawer-user-info">
                <div className="avatar-circle">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="User Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    getUserInitials()
                  )}
                </div>
                <div>
                  <h4 className="user-name-title">
                    {currentUser ? (currentUser.displayName || currentUser.email?.split('@')[0] || 'Ingredia Chef') : 'Guest User'}
                  </h4>
                  <span className="user-email-subtitle">
                    {currentUser ? currentUser.email : 'Not logged in'}
                  </span>
                </div>
              </div>
              <button className="icon-trash-btn" onClick={() => setDrawerOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="drawer-nav-list">
              <NavLink to="/" end className="drawer-nav-item" onClick={() => setDrawerOpen(false)}>
                <Home size={18} /> <span>{t('nav.home')}</span>
              </NavLink>
              <NavLink to="/saved" className="drawer-nav-item" onClick={() => setDrawerOpen(false)}>
                <Heart size={18} /> <span>{t('nav.saved')} ({savedCount})</span>
              </NavLink>
              <NavLink to="/history" className="drawer-nav-item" onClick={() => setDrawerOpen(false)}>
                <History size={18} /> <span>{t('nav.history')}</span>
              </NavLink>
              <NavLink to="/settings" className="drawer-nav-item" onClick={() => setDrawerOpen(false)}>
                <Settings size={18} /> <span>{t('nav.settings')}</span>
              </NavLink>
              {!currentUser && (
                <NavLink to="/auth" className="drawer-nav-item drawer-auth-highlight" onClick={() => setDrawerOpen(false)}>
                  <LogIn size={18} /> <span>Log In / Sign Up</span>
                </NavLink>
              )}
            </div>

            <div className="drawer-bottom-actions">
              <button className="btn-install-app" onClick={handleInstallApp}>
                <Download size={16} /> Install App
              </button>
              {currentUser ? (
                <button className="btn-signout" onClick={handleSignOut}>
                  <LogOut size={16} /> Sign Out
                </button>
              ) : (
                <button className="btn-login-drawer" onClick={handleLogIn}>
                  <LogIn size={16} /> Log In / Sign Up
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
