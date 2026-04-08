import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import type { HeatmapPoint, CrimeReport } from '@/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const riskColors = {
  low: { fill: '#22c55e', stroke: '#16a34a', bg: 'bg-success/10', text: 'text-success' },
  medium: { fill: '#f59e0b', stroke: '#d97706', bg: 'bg-warning/10', text: 'text-warning' },
  high: { fill: '#ef4444', stroke: '#dc2626', bg: 'bg-emergency/10', text: 'text-emergency' },
};

function getRisk(intensity: number) {
  if (intensity >= 0.7) return 'high';
  if (intensity >= 0.4) return 'medium';
  return 'low';
}

function getColor(intensity: number) {
  return riskColors[getRisk(intensity)];
}

function mapRowToHeatmapPoint(r: any): HeatmapPoint {
  return {
    lat: r.crime_location_lat || r.location_lat,
    lng: r.crime_location_lng || r.location_lng,
    intensity: r.severity === 'high' ? 0.9 : r.severity === 'medium' ? 0.6 : 0.3,
    type: r.type,
    areaName: r.crime_location_address || r.location_address || 'Unknown',
    incidentCount: 1,
  };
}

function mapRowToReport(r: any): CrimeReport {
  return {
    _id: r.id,
    userId: r.user_id,
    userName: '',
    type: r.type,
    title: r.title,
    description: r.description,
    location: { lat: r.location_lat, lng: r.location_lng, address: r.location_address || undefined },
    crimeLocation: r.crime_location_lat != null ? { lat: r.crime_location_lat, lng: r.crime_location_lng, address: r.crime_location_address || undefined } : undefined,
    status: r.status,
    severity: r.severity,
    createdAt: r.created_at,
    statusUpdates: r.status_updates || [],
  };
}

function getDateThreshold(period: string): string | null {
  if (period === 'all') return null;
  const now = new Date();
  const days = period === '7d' ? 7 : 30;
  now.setDate(now.getDate() - days);
  return now.toISOString();
}

export default function HeatmapPage() {
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [reports, setReports] = useState<CrimeReport[]>([]);
  const [filter, setFilter] = useState('all');
  const [timePeriod, setTimePeriod] = useState('all');
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const fetchData = useCallback(async () => {
    const threshold = getDateThreshold(timePeriod);
    let query = supabase
      .from('crime_reports')
      .select('id, user_id, type, title, description, severity, status, location_lat, location_lng, location_address, crime_location_lat, crime_location_lng, crime_location_address, created_at, status_updates');

    if (threshold) {
      query = query.gte('created_at', threshold);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return;

    setPoints((data || []).map(mapRowToHeatmapPoint));
    setReports((data || []).map(mapRowToReport));
  }, [timePeriod]);

  // Initial fetch + refetch on time period change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('heatmap-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crime_reports' },
        () => {
          // Refetch all data on any change to stay consistent with time filter
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Map init
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

  const filteredPoints = useMemo(() => {
    if (filter === 'all') return points;
    return points.filter(p => p.type === filter);
  }, [points, filter]);

  const filteredReports = useMemo(() => {
    if (filter === 'all') return reports;
    return reports.filter(r => r.type === filter);
  }, [reports, filter]);

  const areaStats = useMemo(() => {
    const map = new Map<string, { incidents: number; highestRisk: string; types: Set<string> }>();
    filteredPoints.forEach(p => {
      const name = p.areaName || 'Unknown';
      const existing = map.get(name) || { incidents: 0, highestRisk: 'low', types: new Set<string>() };
      existing.incidents += (p.incidentCount || 1);
      existing.types.add(p.type);
      const risk = getRisk(p.intensity);
      if (risk === 'high' || (risk === 'medium' && existing.highestRisk === 'low')) {
        existing.highestRisk = risk;
      }
      map.set(name, existing);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data, types: Array.from(data.types) }))
      .sort((a, b) => b.incidents - a.incidents);
  }, [filteredPoints]);

  // Update map markers
  useEffect(() => {
    if (!layerGroupRef.current) return;
    layerGroupRef.current.clearLayers();

    filteredPoints.forEach(point => {
      const colors = getColor(point.intensity);
      const risk = getRisk(point.intensity);
      const areaName = point.areaName || 'Unknown Area';
      const incidents = point.incidentCount || 1;

      const tooltipContent = `
        <div style="padding:8px;min-width:180px">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px">${areaName}</div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="color:#888">Crime Type</span><span style="text-transform:capitalize">${point.type}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="color:#888">Risk Level</span><span style="text-transform:capitalize;color:${colors.fill}">${risk}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="color:#888">Incidents</span><span>${incidents}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#888">Intensity</span><span>${(point.intensity * 100).toFixed(0)}%</span></div>
        </div>
      `;

      L.circleMarker([point.lat, point.lng], {
        radius: point.intensity * 25 + 8,
        fillColor: colors.fill,
        color: colors.stroke,
        weight: 2,
        fillOpacity: 0.4,
      })
        .bindTooltip(tooltipContent, { permanent: false, direction: 'top', className: 'heatmap-tooltip', offset: [0, -10] })
        .addTo(layerGroupRef.current!);
    });

    filteredReports.forEach(r => {
      const loc = r.crimeLocation || r.location;
      const tooltipContent = `
        <div style="padding:6px;min-width:150px">
          <div style="font-weight:700;margin-bottom:4px">${r.title}</div>
          <div style="font-size:12px;color:#888">${r.type} · ${r.severity} severity</div>
          <div style="font-size:12px;color:#888">${loc.address || ''}</div>
        </div>
      `;

      L.circleMarker([loc.lat, loc.lng], {
        radius: 6,
        fillColor: r.severity === 'high' ? '#ef4444' : r.severity === 'medium' ? '#f59e0b' : '#22c55e',
        color: '#fff',
        weight: 2,
        fillOpacity: 0.9,
      })
        .bindTooltip(tooltipContent, { permanent: false, direction: 'top', className: 'heatmap-tooltip', offset: [0, -8] })
        .addTo(layerGroupRef.current!);
    });
  }, [filteredPoints, filteredReports]);

  const types = ['all', 'theft', 'assault', 'vandalism', 'robbery', 'fraud', 'harassment'];
  const totalIncidents = areaStats.reduce((sum, a) => sum + a.incidents, 0);
  const highRiskAreas = areaStats.filter(a => a.highestRisk === 'high').length;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-2">Crime Heatmap</h1>
        <p className="text-muted-foreground mb-6">Visualize crime hotspots across Dehradun · Updates in real-time</p>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-primary">{totalIncidents}</div>
            <div className="text-sm text-muted-foreground">Total Incidents</div>
          </div>
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-emergency">{highRiskAreas}</div>
            <div className="text-sm text-muted-foreground">High Risk Zones</div>
          </div>
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-success">{areaStats.length}</div>
            <div className="text-sm text-muted-foreground">Monitored Areas</div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* Crime type filter */}
          <div className="flex flex-wrap gap-2">
            {types.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                  filter === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}>
                {t}
              </button>
            ))}
          </div>

          {/* Time period filter */}
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-4">
          {[
            { label: 'Low Risk', color: 'bg-success' },
            { label: 'Medium Risk', color: 'bg-warning' },
            { label: 'High Risk', color: 'bg-emergency' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${l.color}`} />
              {l.label}
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            Live
          </div>
        </div>

        {/* Map */}
        <div ref={mapContainerRef} className="w-full h-[500px] rounded-2xl overflow-hidden glass-card mb-8" />

        {/* Area Stats Panel */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Area-wise Crime Statistics</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {areaStats.map((area, i) => {
              const riskStyle = riskColors[area.highestRisk as keyof typeof riskColors];
              return (
                <motion.div key={area.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{area.name}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${riskStyle.bg} ${riskStyle.text}`}>
                      {area.highestRisk}
                    </span>
                  </div>
                  <div className="text-2xl font-bold mb-1">{area.incidents}</div>
                  <div className="text-sm text-muted-foreground mb-2">incidents reported</div>
                  <div className="flex flex-wrap gap-1">
                    {area.types.map(t => (
                      <span key={t} className="text-xs bg-accent px-2 py-0.5 rounded capitalize">{t}</span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
