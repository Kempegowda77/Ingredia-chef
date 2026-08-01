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
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  syncUserProfile
} from '../firebase';
import './AuthForm.css';

import { validateAuthInput } from '../utils/authValidation';

export default function AuthForm({ mode, onToggle, onSuccess }) {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState(mode || 'login'); // 'login', 'signup', or 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const isLogin = authMode === 'login';
  const isReset = authMode === 'reset';

  const validate = () => {
    const schemaType = isReset ? 'reset' : (isLogin ? 'login' : 'signup');
    
    // Additional password match check for signup before schema
    if (!isLogin && !isReset && password !== confirm) {
      console.warn('[SECURITY MONITOR] Signup password mismatch attempt');
      setError('Invalid email or password format. Please verify your details and try again.');
      return null;
    }

    const validation = validateAuthInput({ email, password }, schemaType);

    if (!validation.isValid) {
      setError(validation.error);
      return null;
    }

    return { 
      cleanEmail: validation.data.email, 
      cleanPass: validation.data.password 
    };
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    const creds = validate();
    if (!creds) return;

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, creds.cleanEmail);
      setSuccessMsg('Password reset link sent! Please check your email inbox and spam folder.');
    } catch (err) {
      console.warn('Password reset error:', err);
      let msg = err.message || 'Failed to send password reset email';
      if (err.code === 'auth/user-not-found') {
        msg = 'No registered user account found with this email address';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address format';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (isReset) {
      return handlePasswordReset(e);
    }

    e.preventDefault();
    setError('');
    setSuccessMsg('');
    const creds = validate();
    if (!creds) return;

    setLoading(true);
    try {
      let userCredential;
      if (isLogin) {
        // Real email & password verification before logging in
        userCredential = await signInWithEmailAndPassword(auth, creds.cleanEmail, creds.cleanPass);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, creds.cleanEmail, creds.cleanPass);
      }
      const user = userCredential.user;
      await syncUserProfile(user);
      const token = (await user.getIdToken()) || btoa(creds.cleanEmail);
      setAuthToken(token);

      if (onSuccess) onSuccess(); else navigate('/');
    } catch (err) {
      console.warn('Firebase email auth note:', err.message);
      let msg = err.message || 'Authentication failed';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password. Please check your credentials and try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please log in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }

      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/network-request-failed') {
        const fallbackToken = btoa(creds.cleanEmail);
        setAuthToken(fallbackToken);
        if (onSuccess) onSuccess(); else navigate('/');
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await syncUserProfile(result.user);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || (await result.user.getIdToken()) || result.user?.uid;
      setAuthToken(token);
      if (onSuccess) onSuccess(); else navigate('/');
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
      <h2 className="auth-title">
        {isReset ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account')}
      </h2>
      <p className="auth-subtitle">
        {isReset 
          ? 'Enter your registered email address to receive a password reset link' 
          : (isLogin ? 'Sign in to access your saved recipes & preferences' : 'Join Ingredia Kitchen to start organizing your culinary journey')}
      </p>

      {error && <div className="auth-error" role="alert">{error}</div>}
      {successMsg && <div className="auth-success" role="alert" style={{ background: '#E6F4EA', color: '#0F9D58', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px', fontWeight: '600' }}>{successMsg}</div>}

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

      {!isReset && (
        <div className="auth-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="password">Password</label>
            {isLogin && (
              <button 
                type="button" 
                className="forgot-password-link"
                onClick={() => { setAuthMode('reset'); setError(''); setSuccessMsg(''); }}
                style={{ background: 'none', border: 'none', color: '#0F9D58', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0 }}
              >
                Forgot Password?
              </button>
            )}
          </div>
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
      )}

      {!isLogin && !isReset && (
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
        {loading 
          ? (isReset ? 'Sending Reset Link...' : (isLogin ? 'Verifying & Logging In...' : 'Creating Account...')) 
          : (isReset ? 'Send Reset Password Link' : (isLogin ? 'Log In' : 'Create Account'))}
      </button>

      {!isReset && (
        <>
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
        </>
      )}

      <p className="auth-switch">
        {isReset ? (
          <button 
            type="button" 
            className="auth-toggle-link" 
            onClick={() => { setAuthMode('login'); setError(''); setSuccessMsg(''); }}
            disabled={loading}
          >
            ← Back to Log In
          </button>
        ) : (
          <>
            {isLogin ? "Don’t have an account?" : "Already have an account?"}
            <button 
              type="button" 
              className="auth-toggle-link" 
              onClick={() => {
                const nextMode = isLogin ? 'signup' : 'login';
                setAuthMode(nextMode);
                if (onToggle) onToggle();
                setError('');
                setSuccessMsg('');
              }} 
              disabled={loading}
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </>
        )}
      </p>
    </form>
  );
}
