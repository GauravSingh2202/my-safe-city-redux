import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, MapPin, Camera, Send, Loader2, CheckCircle, Navigation } from 'lucide-react';
import { api, reverseGeocode } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { CrimeReport } from '@/types';
import MapPicker from '@/components/MapPicker';

const crimeTypes: { value: CrimeReport['type']; label: string }[] = [
  { value: 'theft', label: 'Theft' },
  { value: 'assault', label: 'Assault' },
  { value: 'vandalism', label: 'Vandalism' },
  { value: 'robbery', label: 'Robbery' },
  { value: 'fraud', label: 'Fraud' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'other', label: 'Other' },
];

const severities: { value: CrimeReport['severity']; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-success/20 text-success border-success/30' },
  { value: 'medium', label: 'Medium', color: 'bg-warning/20 text-warning border-warning/30' },
  { value: 'high', label: 'High', color: 'bg-emergency/20 text-emergency border-emergency/30' },
];

export default function ReportCrimePage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', type: 'theft' as CrimeReport['type'], severity: 'medium' as CrimeReport['severity'] });
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [crimeLocation, setCrimeLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  const getLocation = async () => {
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      const address = await reverseGeocode(lat, lng);
      setLocation({ lat, lng, address });
      toast.success('Location captured');
    } catch {
      const address = await reverseGeocode(30.3165, 78.0322);
      setLocation({ lat: 30.3165, lng: 78.0322, address });
      toast.info('Using default location (Dehradun)');
    } finally {
      setLocating(false);
    }
  };

  const handlePinChange = async (loc: { lat: number; lng: number }) => {
    setCrimeLocation({ ...loc, address: 'Resolving…' });
    const address = await reverseGeocode(loc.lat, loc.lng);
    setCrimeLocation({ ...loc, address });
  };

  const useSameAsMyLocation = () => {
    if (location) {
      handlePinChange({ lat: location.lat, lng: location.lng });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) { toast.error('Please capture your location first'); return; }
    setSubmitting(true);
    try {
      await api.submitCrimeReport({
        ...form,
        userId: user?._id,
        userName: user?.name,
        location,
        crimeLocation: crimeLocation || undefined,
        mediaNames: files.map(f => f.name),
      });
      setSubmitted(true);
      toast.success('Report submitted successfully!');
    } catch {
      toast.error('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center glass-card rounded-2xl p-10">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Report Submitted</h2>
          <p className="text-muted-foreground mb-6">Your crime report has been submitted and will be reviewed by our team.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/my-reports')} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90">
              View My Reports
            </button>
            <button onClick={() => { setSubmitted(false); setForm({ title: '', description: '', type: 'theft', severity: 'medium' }); setLocation(null); setCrimeLocation(null); setCrimeLocationInput({ lat: '', lng: '' }); setFiles([]); }}
              className="px-6 py-2.5 border border-border rounded-lg font-medium hover:bg-accent">
              Submit Another
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-2">Report a Crime</h1>
          <p className="text-muted-foreground mb-8">Help keep your community safe</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Crime Type */}
            <div className="glass-card rounded-xl p-5">
              <label className="text-sm font-semibold mb-3 block">Crime Type</label>
              <div className="flex flex-wrap gap-2">
                {crimeTypes.map(t => (
                  <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, type: t.value }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${form.type === t.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div className="glass-card rounded-xl p-5">
              <label className="text-sm font-semibold mb-3 block">Severity</label>
              <div className="flex gap-2">
                {severities.map(s => (
                  <button key={s.value} type="button" onClick={() => setForm(f => ({ ...f, severity: s.value }))}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${form.severity === s.value ? s.color + ' border' : 'border-border hover:bg-accent'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Description */}
            <div className="glass-card rounded-xl p-5 space-y-4">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  placeholder="Brief description of the incident" required />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none min-h-[100px] resize-none"
                  placeholder="Provide detailed information about the incident" required />
              </div>
            </div>

            {/* Your Location */}
            <div className="glass-card rounded-xl p-5">
              <label className="text-sm font-semibold mb-3 block">Your Location</label>
              {location ? (
                <div className="flex items-center gap-2 text-sm text-success">
                  <MapPin className="w-4 h-4" />
                  <span>{location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}</span>
                </div>
              ) : (
                <button type="button" onClick={getLocation} disabled={locating}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 text-primary font-medium text-sm hover:bg-primary/20 transition-colors">
                  {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  {locating ? 'Getting location...' : 'Capture My Location'}
                </button>
              )}
            </div>

            {/* Crime Location */}
            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold">Pin Crime Location on Map</label>
                {location && (
                  <button type="button" onClick={useSameAsMyLocation} className="text-xs text-primary hover:underline">
                    Use my location
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">Click or drag the pin to set the exact location.</p>
              <MapPicker
                value={crimeLocation}
                initialCenter={location || undefined}
                onChange={handlePinChange}
              />
              {crimeLocation && (
                <div className="flex items-start gap-2 text-sm text-success mt-3">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <div>{crimeLocation.address}</div>
                    <div className="text-xs text-muted-foreground">Lat: {crimeLocation.lat.toFixed(5)}, Lng: {crimeLocation.lng.toFixed(5)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Evidence */}
            <div className="glass-card rounded-xl p-5">
              <label className="text-sm font-semibold mb-3 block">Evidence (optional)</label>
              <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))}
                className="text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-primary/10 file:text-primary" />
              {files.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {files.map((f, i) => (
                    <span key={i} className="text-xs bg-accent px-2 py-1 rounded">{f.name}</span>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={submitting}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
