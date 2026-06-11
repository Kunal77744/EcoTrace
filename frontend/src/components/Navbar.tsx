import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Logo: React.FC = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="logo-svg"
  >
    <defs>
      <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    <path
      d="M16 2C8 2 2 8 2 16C2 21 6.5 25.5 11.5 28C13 28.8 14.5 26.8 14.5 25V18C14.5 16.5 15.5 15.5 17 15.5H23.5C25.5 15.5 27 13.5 26.5 11.5C25 6 21 2 16 2Z"
      fill="url(#logo-grad)"
      opacity="0.85"
    />
    <path
      d="M16 2C21 2 26 6 28 11.5C29.5 15.5 27.5 20.5 23.5 20.5H18.5C17.5 20.5 16.5 21.5 16.5 22.5V28C16.5 29.5 18 30.5 19.5 30C25 28.5 30 23 30 16C30 8 24 2 16 2Z"
      fill="url(#logo-grad)"
      opacity="0.95"
    />
    <circle cx="16" cy="14" r="2.5" fill="#ffffff" />
    <path d="M16 16.5V23" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
  </svg>
);

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to={user ? '/' : '/login'} className="navbar-brand">
          <Logo /> EcoTrace
        </Link>
        
        <div className="navbar-menu">
          {user ? (
            <>
              <Link to="/" className="nav-link">Dashboard</Link>
              <Link to="/calculator" className="nav-link">AI Calculator</Link>
              <div className="navbar-user-info">
                <span className="points-badge">✨ {user.totalPoints} pts</span>
                <span className="username-display">{user.name}</span>
                <button onClick={handleLogout} className="btn-logout">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
