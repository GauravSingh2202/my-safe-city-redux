import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Bell, Menu, X, LogOut, User, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/report', label: 'Report Crime' },
    { path: '/heatmap', label: 'Crime Map' },
    { path: '/emergency-services', label: 'Emergency' },
  ];

  if (isAuthenticated && user?.role !== 'admin') {
    navItems.push({ path: '/my-reports', label: 'My Reports' });
  }

  if (user?.role === 'admin') {
    navItems.push({ path: '/admin', label: 'Dashboard' });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 h-[var(--nav-height)] bg-card/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto h-full flex items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Shield className="w-6 h-6 text-primary" />
          <span className="gradient-text">MySafeCity</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-accent transition-colors">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {isAuthenticated && (
            <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-accent transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-emergency text-emergency-foreground rounded-full text-xs flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </Link>
          )}

          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50 hover:bg-accent transition-colors cursor-pointer">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{user?.name}</span>
              </Link>
              <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link to="/login" className="hidden md:inline-flex px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Sign In
            </Link>
          )}

          {/* Mobile menu button */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-accent">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-card border-b border-border overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {isAuthenticated ? (
                <>
                  <Link to="/profile" onClick={() => setMobileOpen(false)} className="px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent text-left flex items-center gap-2">
                    <User className="w-4 h-4" /> My Profile
                  </Link>
                  <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent text-left flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={() => setMobileOpen(false)} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium text-center">
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
