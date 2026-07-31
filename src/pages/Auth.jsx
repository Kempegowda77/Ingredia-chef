import React, { useState } from 'react';
import AuthForm from '../components/AuthForm';
import '../App.css'; // ensure styles are loaded

export default function Auth() {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'

  const toggleMode = () => setMode(prev => (prev === 'login' ? 'signup' : 'login'));

  return (
    <div className="auth-page">
      <div className="auth-card glassmorphism">
        <AuthForm mode={mode} onToggle={toggleMode} />
      </div>
    </div>
  );
}
