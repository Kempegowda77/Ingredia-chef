import React, { useState } from 'react';
import AuthForm from '../components/AuthForm';
import SEO from '../components/SEO';
import '../App.css'; // ensure styles are loaded

export default function Auth() {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'

  const toggleMode = () => setMode(prev => (prev === 'login' ? 'signup' : 'login'));

  return (
    <div className="auth-page">
      <SEO 
        title="Log In or Sign Up | Ingredia Kitchen"
        description="Sign in to your Ingredia Kitchen account to sync saved recipes, cooking history, and preferences across devices."
        canonical="https://ingredia.vercel.app/auth"
      />
      <div className="auth-card glassmorphism">
        <AuthForm mode={mode} onToggle={toggleMode} />
      </div>
    </div>
  );
}
