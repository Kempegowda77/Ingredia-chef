import React from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"
import { Sun, Moon, Globe, Sliders, Bell, Info, ShieldCheck, FileText, User, LogIn, LogOut, CheckCircle2 } from "lucide-react"
import { LANGUAGES } from "../i18n"
import { auth, signOut, onAuthStateChanged } from "../firebase"
import SEO from "../components/SEO"

export default function Settings() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [theme, setTheme] = React.useState(() => localStorage.getItem('ingredia_theme') || 'system')
  const [units, setUnits] = React.useState(() => localStorage.getItem('ingredia_units') || 'metric')
  const [emailNotifs, setEmailNotifs] = React.useState(true)
  const [pushNotifs, setPushNotifs] = React.useState(true)
  const [currentUser, setCurrentUser] = React.useState(null)
  const [activeModal, setActiveModal] = React.useState(null)

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
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
          } catch (e) {}
        }
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  async function handleSignOut() {
    try {
      await signOut(auth);
    } catch (e) {}
    clearAuthToken();
    setCurrentUser(null);
    navigate('/auth');
  }

  const getUserInitials = () => {
    if (!currentUser) return 'GU';
    if (currentUser.displayName) {
      const parts = currentUser.displayName.split(' ');
      return parts.length >= 2 
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
    }
    if (currentUser.email) {
      return currentUser.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  function handleThemeChange(val) {
    setTheme(val)
    localStorage.setItem('ingredia_theme', val)
  }

  function handleLangChange(val) {
    i18n.changeLanguage(val)
    localStorage.setItem('ingredia_lang', val)
  }

  function handleUnitsChange(val) {
    setUnits(val)
    localStorage.setItem('ingredia_units', val)
  }

  return (
    <main className="main-content">
      <SEO 
        title="Settings & Preferences | Ingredia Kitchen"
        description="Customize your Ingredia kitchen companion experience, language preferences, and measurement units."
        canonical="https://ingredia.vercel.app/settings"
      />
      <div className="layout-single-column">
        <h1 className="section-heading-large mb-2">{t('settingsTitle')}</h1>
        <p className="section-subheading mb-6">{t('settingsSub')}</p>

        <div className="settings-sections-flex">
          {/* SECTION 0: ACCOUNT & USER PROFILE */}
          <div className="settings-card profile-settings-card">
            <div className="settings-card-title">
              <User size={20} color="#0F9D58" />
              <h3>Account Profile</h3>
            </div>
            
            <div className="profile-card-content mt-4">
              <div className="profile-user-row">
                <div className="profile-avatar-circle">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="User Avatar" className="profile-avatar-img" />
                  ) : (
                    <span className="profile-initials-text">{getUserInitials()}</span>
                  )}
                </div>
                <div className="profile-details-column">
                  <h4 className="profile-display-name">
                    {currentUser ? (currentUser.displayName || "Ingredia Chef User") : "Guest User"}
                  </h4>
                  <p className="profile-email-text">
                    {currentUser ? currentUser.email : "Sign in to save and sync recipes across all devices"}
                  </p>
                  {currentUser && (
                    <span className="account-verified-pill">
                      <CheckCircle2 size={12} /> Verified Account
                    </span>
                  )}
                </div>
              </div>

              <div className="profile-action-btn-row mt-4">
                {currentUser ? (
                  <button className="btn-outline-logout" onClick={handleSignOut}>
                    <LogOut size={16} /> Sign Out Account
                  </button>
                ) : (
                  <Link to="/auth" className="btn-pulse-green btn-full-mobile">
                    <LogIn size={16} /> Log In / Sign Up
                  </Link>
                )}
              </div>
            </div>
          </div>
          {/* SECTION 1: LANGUAGE & REGION */}
          <div className="settings-card">
            <div className="settings-card-title">
              <Globe size={20} color="#2563EB" />
              <h3>{t('language')}</h3>
            </div>
            <p className="settings-card-subtitle">Select your preferred instruction and UI language.</p>

            <div className="select-box-styled mt-4">
              <Globe size={18} color="#2563EB" />
              <select 
                className="settings-dropdown-select"
                value={i18n.language || 'en'}
                onChange={(e) => handleLangChange(e.target.value)}
                aria-label="Select Language"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.native} ({lang.label})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 2: APPEARANCE THEME */}
          <div className="settings-card">
            <div className="settings-card-title">
              <Sun size={20} color="#EA580C" />
              <h3>{t('theme')}</h3>
            </div>
            <p className="settings-card-subtitle">Choose your preferred visual mode.</p>

            <div className="segmented-options-row mt-4">
              <button 
                className={`segmented-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <Sun size={16} /> Light
              </button>
              <button 
                className={`segmented-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <Moon size={16} /> Dark
              </button>
            </div>
          </div>

          {/* SECTION 3: MEASUREMENT UNITS */}
          <div className="settings-card">
            <div className="settings-card-title">
              <Sliders size={20} color="#16A34A" />
              <h3>{t('units')}</h3>
            </div>
            <p className="settings-card-subtitle">Default measurement format for recipe steps.</p>

            <div className="segmented-options-row mt-4">
              <button 
                className={`segmented-btn ${units === 'metric' ? 'active' : ''}`}
                onClick={() => handleUnitsChange('metric')}
              >
                Metric (grams, ml, °C)
              </button>
              <button 
                className={`segmented-btn ${units === 'imperial' ? 'active' : ''}`}
                onClick={() => handleUnitsChange('imperial')}
              >
                Imperial (oz, tbsp, °F)
              </button>
            </div>
          </div>

          {/* SECTION 4: NOTIFICATIONS */}
          <div className="settings-card">
            <div className="settings-card-title">
              <Bell size={20} color="#D97706" />
              <h3>{t('notifications')}</h3>
            </div>
            <p className="settings-card-subtitle">Manage recipe updates and cooking tips.</p>

            <div className="toggles-list-column mt-4">
              <label className="toggle-item-row">
                <span>Email Digest & Cooking Tips</span>
                <input 
                  type="checkbox" 
                  checked={emailNotifs} 
                  onChange={(e) => setEmailNotifs(e.target.checked)} 
                />
              </label>

              <label className="toggle-item-row">
                <span>Push Cooking Timer Alerts</span>
                <input 
                  type="checkbox" 
                  checked={pushNotifs} 
                  onChange={(e) => setPushNotifs(e.target.checked)} 
                />
              </label>
            </div>
          </div>

          {/* SECTION 5: ABOUT & LEGAL */}
          <div className="settings-card">
            <div className="settings-card-title">
              <Info size={20} color="#9333EA" />
              <h3>{t('about')}</h3>
            </div>

            <div className="about-details-list mt-4">
              <div className="about-item-row">
                <span>App Version</span>
                <span className="version-pill">v2.4.0 (Multilingual Edition)</span>
              </div>

              <div className="about-item-row">
                <span>Developer</span>
                <span className="font-semibold">Ingredia Technologies Inc.</span>
              </div>

              <div className="legal-buttons-row mt-4">
                <button 
                  className="try-pill-btn" 
                  onClick={() => setActiveModal('privacy')}
                >
                  <ShieldCheck size={14} inline /> Privacy Policy
                </button>
                <button 
                  className="try-pill-btn" 
                  onClick={() => setActiveModal('terms')}
                >
                  <FileText size={14} inline /> Terms of Service
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Modal Dialog */}
        {activeModal && (
          <div className="modal-backdrop-glass" onClick={() => setActiveModal(null)}>
            <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-top-bar">
                <h3>{activeModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}</h3>
                <button className="icon-trash-btn" onClick={() => setActiveModal(null)}>✕</button>
              </div>
              <div className="modal-recipe-body">
                <p>
                  Ingredia respects your privacy. All your pantry data and cooking history stay stored safely in your browser local storage.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
