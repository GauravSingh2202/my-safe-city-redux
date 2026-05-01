import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, AlertTriangle, Phone, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { toast } from 'sonner';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function AIChatbot() {
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hi, I'm your Safety Advisor. If you're in danger, tell me what's happening and I'll guide you step by step." },
  ]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !location) {
      navigator.geolocation?.getCurrentPosition(
        p => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setLocation({ lat: 30.3165, lng: 78.0322 }),
        { timeout: 5000 }
      );
    }
  }, [open, location]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  if (!isAuthenticated || user?.role === 'admin') return null;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const newMsgs: Msg[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: trimmed,
          location,
          history: newMsgs.slice(-10).map(m => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'assistant', content: data?.reply || '...' }]);
    } catch (e: any) {
      const msg = e?.message || 'Failed to reach safety advisor';
      toast.error(msg);
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const triggerSOS = async () => {
    try {
      const loc = location || { lat: 30.3165, lng: 78.0322 };
      await api.triggerSOS(loc);
      toast.success('SOS alert sent');
      setMessages(prev => [...prev, { role: 'assistant', content: '🚨 SOS alert sent. Help is being notified. Stay where you are if safe, or move to a crowded area.' }]);
    } catch {
      toast.error('Failed to send SOS');
    }
  };

  const findPolice = () => send('Where is the nearest police station and how do I get there safely?');
  const emergencyCall = () => { window.location.href = 'tel:100'; };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-28 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Open Safety Advisor"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success animate-pulse" />
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-3rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Safety Advisor</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    AI online
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-accent" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-secondary text-secondary-foreground rounded-bl-sm'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-secondary px-3.5 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
                  </div>
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="px-3 py-2 border-t border-border flex gap-2 overflow-x-auto">
              <button onClick={triggerSOS} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emergency/10 text-emergency text-xs font-semibold hover:bg-emergency/20">
                <AlertTriangle className="w-3.5 h-3.5" /> Trigger SOS
              </button>
              <button onClick={findPolice} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20">
                <MapPin className="w-3.5 h-3.5" /> Nearest police
              </button>
              <button onClick={emergencyCall} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-semibold hover:bg-success/20">
                <Phone className="w-3.5 h-3.5" /> Call 100
              </button>
            </div>

            {/* Input */}
            <form
              onSubmit={e => { e.preventDefault(); send(input); }}
              className="p-3 border-t border-border flex gap-2"
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Describe what's happening…"
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-3 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}