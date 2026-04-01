import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Phone, Shield as ShieldIcon, Flame, Hospital, Navigation, ExternalLink } from 'lucide-react';
import { api } from '@/services/api';
import type { EmergencyService } from '@/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const iconMap: Record<string, { icon: any; color: string; bg: string }> = {
  police: { icon: ShieldIcon, color: 'text-primary', bg: 'bg-primary/10' },
  hospital: { icon: Hospital, color: 'text-success', bg: 'bg-success/10' },
  fire: { icon: Flame, color: 'text-emergency', bg: 'bg-emergency/10' },
};

const markerColors: Record<string, string> = { police: '#2563eb', hospital: '#22c55e', fire: '#ef4444' };

export default function EmergencyServicesPage() {
  const [services, setServices] = useState<EmergencyService[]>([]);
  const [filter, setFilter] = useState('all');
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    api.getEmergencyServices().then(setServices);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current).setView([30.3165, 78.0322], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  const filtered = filter === 'all' ? services : services.filter(s => s.type === filter);

  useEffect(() => {
    if (!layerGroupRef.current) return;
    layerGroupRef.current.clearLayers();

    filtered.forEach(s => {
      const color = markerColors[s.type] || '#2563eb';
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:24px;height:24px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([s.location.lat, s.location.lng], { icon })
        .bindPopup(`<div style="padding:4px"><strong>${s.name}</strong><br/><span style="color:#888">${s.address}</span><br/><a href="tel:${s.phone}">${s.phone}</a></div>`)
        .addTo(layerGroupRef.current!);
    });
  }, [filtered]);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-2">Nearby Emergency Services</h1>
        <p className="text-muted-foreground mb-6">Find police, hospitals, and fire stations near you</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'police', 'hospital', 'fire'].map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                filter === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}>
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>

        {/* Map */}
        <div ref={mapContainerRef} className="w-full h-[400px] rounded-2xl overflow-hidden glass-card mb-8" />

        {/* List */}
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(s => {
            const meta = iconMap[s.type];
            const Icon = meta.icon;
            return (
              <motion.div key={s._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card-hover rounded-xl p-5 flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-6 h-6 ${meta.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-sm text-muted-foreground mb-1">{s.address}</p>
                  <div className="flex items-center gap-3 text-sm">
                    <a href={`tel:${s.phone}`} className="text-primary font-medium flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {s.phone}
                    </a>
                    <span className="text-muted-foreground">{s.distance} km</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
