
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, User, Phone as PhoneIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type SignupMode = 'form' | 'phone';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<SignupMode>('form');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Check your email to verify.');
      navigate('/');
    } catch (err: any) {
      if (err.message?.includes('already registered')) {
        toast.error('This email is already registered. Please sign in.');
      } else {
        toast.error(err.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Enter a valid phone number with country code (e.g. +91...)');
      return;
    }
    setLoading(true);
    try {
      const res = await supabase.functions.invoke('send-otp', {
        body: { phone, action: 'send' },
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      setOtpSent(true);
      toast.success('OTP sent to your phone!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await supabase.functions.invoke('send-otp', {
        body: { phone, code: otp, action: 'verify' },
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      if (res.data?.session?.token_hash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: res.data.session.token_hash,
          type: 'magiclink',
        });
        if (error) throw new Error(error.message);
      }

      toast.success('Welcome to MySafeCity!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error instanceof Error ? result.error.message : 'Google sign-up failed');
        return;
      }
      if (result.redirected) return;
      toast.success('Welcome to MySafeCity!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Google sign-up failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="glass-card rounded-2xl p-8">
          <div className="text-center mb-8">
            <Shield className="w-12 h-12 text-primary mx-auto mb-3" />
            <h1 className="text-2xl font-bold">Create Account</h1>
            <p className="text-muted-foreground text-sm mt-1">Join MySafeCity today</p>
          </div>

          {/* Google */}
          <button onClick={handleGoogleSignup} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg border border-input bg-background text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50 mb-4">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {googleLoading ? 'Signing up...' : 'Sign up with Google'}
          </button>

          {/* Mode tabs */}
          <div className="flex rounded-lg border border-input overflow-hidden mb-6">
            <button onClick={() => { setMode('phone'); setOtpSent(false); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'phone' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent'}`}>
              <PhoneIcon className="w-4 h-4 inline mr-1.5" />Phone
            </button>
            <button onClick={() => setMode('form')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'form' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent'}`}>
              <Mail className="w-4 h-4 inline mr-1.5" />Email
            </button>
          </div>

          {mode === 'phone' && !otpSent && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Phone Number</label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                    placeholder="+91 9876543210" required />
                </div>
              </div>
              <button onClick={handleSendOtp} disabled={loading}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </div>
          )}

          {mode === 'phone' && otpSent && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">OTP sent to <span className="font-medium text-foreground">{phone}</span></p>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Enter OTP</label>
                <input type="text" value={otp} onChange={e => setOtp(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm text-center tracking-[0.5em] focus:ring-2 focus:ring-primary/30 outline-none"
                  placeholder="000000" maxLength={6} required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </button>
              <button type="button" onClick={() => setOtpSent(false)} className="w-full text-sm text-muted-foreground hover:text-foreground">
                Change number
              </button>
            </form>
          )}

          {mode === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { key: 'name', label: 'Full Name', icon: User, type: 'text', placeholder: 'John Doe', required: true },
                { key: 'email', label: 'Email', icon: Mail, type: 'email', placeholder: 'john@example.com', required: true },
                { key: 'phone', label: 'Phone (optional)', icon: PhoneIcon, type: 'tel', placeholder: '+91 9876543210', required: false },
                { key: 'password', label: 'Password', icon: Lock, type: 'password', placeholder: '••••••••', required: true },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-sm font-medium mb-1.5 block">{field.label}</label>
                  <div className="relative">
                    <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type={field.type} value={(form as any)[field.key]} onChange={e => update(field.key, e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                      placeholder={field.placeholder} required={field.required} />
                  </div>
                </div>
              ))}
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
