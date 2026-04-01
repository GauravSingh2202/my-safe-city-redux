import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, User, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created!');
      navigate('/');
    } catch {
      toast.error('Registration failed');
    } finally {
      setLoading(false);
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'name', label: 'Full Name', icon: User, type: 'text', placeholder: 'John Doe', required: true },
              { key: 'email', label: 'Email', icon: Mail, type: 'email', placeholder: 'john@example.com', required: true },
              { key: 'phone', label: 'Phone (optional)', icon: Phone, type: 'tel', placeholder: '+1234567890', required: false },
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

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
