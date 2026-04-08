import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, MapPin, Loader2, CheckCircle } from 'lucide-react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function SOSButton() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<'idle' | 'locating' | 'sending' | 'sent'>('idle');

  // Hide SOS for non-authenticated users and admin users
  if (!isAuthenticated || user?.role === 'admin') return null;

  const handleSOS = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setState('locating');
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      setState('sending');
      await api.triggerSOS({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setState('sent');
      setTimeout(() => setState('idle'), 3000);
    } catch {
      setState('sending');
      await api.triggerSOS({ lat: 30.3165, lng: 78.0322 });
      setState('sent');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  if (state === 'sent') {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50 bg-success text-success-foreground px-6 py-3 rounded-full shadow-lg flex items-center gap-2 font-semibold"
      >
        <CheckCircle className="w-5 h-5" />
        Alert Sent!
      </motion.div>
    );
  }

  return (
    <motion.button
      onClick={handleSOS}
      disabled={state !== 'idle'}
      whileTap={{ scale: 0.95 }}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-2xl transition-all ${
        state === 'idle'
          ? 'bg-emergency text-emergency-foreground pulse-emergency hover:scale-105'
          : 'bg-emergency/80 text-emergency-foreground cursor-wait'
      }`}
    >
      {state === 'idle' && (
        <>
          <AlertTriangle className="w-5 h-5" />
          SOS
        </>
      )}
      {state === 'locating' && (
        <>
          <MapPin className="w-5 h-5 animate-pulse" />
          Locating...
        </>
      )}
      {state === 'sending' && (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Sending...
        </>
      )}
    </motion.button>
  );
}
