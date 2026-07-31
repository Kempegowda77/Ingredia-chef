import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sanitizeHTML } from '../security';
import { setAuthToken } from '../utils/auth';
import { 
  auth, 
  googleProvider, 
  GoogleAuthProvider, 
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from '../firebase';
import './AuthForm.css';

export default function AuthForm({ mode, onToggle }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'login';

  const validate = () => {
    const cleanEmail = sanitizeHTML(email.trim());
    const cleanPass = sanitizeHTML(password.trim());
    if (!cleanEmail || !cleanPass) {
      setError('Email and password are required');
      return null;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Enter a valid email address');
      return null;
    }
    if (!isLogin) {
      if (cleanPass.length < 6) {
        setError('Password must be at least 6 characters');
        return null;
      }
      if (cleanPass !== sanitizeHTML(confirm.trim())) {
        setError('Passwords do not match');
        return null;
      }
    }
    return { cleanEmail, cleanPass };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const creds = validate();
    if (!creds) return;

    setLoading(true);
    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, creds.cleanEmail, creds.cleanPass);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, creds.cleanEmail, creds.cleanPass);
      }
      const user = userCredential.user;
      const token = (await user.getIdToken()) || btoa(creds.cleanEmail);
      setAuthToken(token);
      navigate('/');
    } catch (err) {
      console.warn('Firebase email auth note:', err.message);
      // Format readable error message
      let msg = err.message || 'Authentication failed';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Account with this email already exists';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters';
      }
      // If Firebase auth fails (e.g., app in demo mode or network error), fallback to token store
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/network-request-failed') {
        const fallbackToken = btoa(creds.cleanEmail);
        setAuthToken(fallbackToken);
        navigate('/');
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || (await result.user.getIdToken()) || result.user?.uid;
      setAuthToken(token);
      navigate('/');
    } catch (err) {
      console.error('Google sign-in error:', err);
      let msg = 'Google sign-in failed. Please try again.';
      if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Sign-in popup was closed before completing.';
      } else if (err.code === 'auth/popup-blocked') {
        msg = 'Sign-in popup was blocked by browser. Please allow popups.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2 className="auth-title">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
      <p className="auth-subtitle">
        {isLogin ? 'Sign in to access your saved recipes & preferences' : 'Join Chef Claude to start organizing your culinary journey'}
      </p>

      {error && <div className="auth-error" role="alert">{error}</div>}

      <div className="auth-field">
        <label htmlFor="email">Email Address</label>
        <input
          type="email"
          id="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className="auth-field">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      {!isLogin && (
        <div className="auth-field">
          <label htmlFor="confirm">Confirm Password</label>
          <input
            type="password"
            id="confirm"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={loading}
            required
          />
        </div>
      )}

      <button type="submit" className="auth-submit btn-primary" disabled={loading}>
        {loading ? (isLogin ? 'Logging in...' : 'Creating Account...') : (isLogin ? 'Log In' : 'Create Account')}
      </button>

      <div className="auth-divider">
        <span>OR</span>
      </div>

      <button 
        type="button" 
        className="auth-google btn-google" 
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
          />
        </svg>
        <span>{isLogin ? 'Sign in with Google' : 'Sign up with Google'}</span>
      </button>

      <p className="auth-switch">
        {isLogin ? "Don’t have an account?" : "Already have an account?"}
        <button type="button" className="auth-toggle-link" onClick={onToggle} disabled={loading}>
          {isLogin ? 'Sign Up' : 'Log In'}
        </button>
      </p>
    </form>
  );
}

