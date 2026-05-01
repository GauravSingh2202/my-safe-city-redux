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
    resolvedAt: r.resolved_at || undefined,
    crimeTime: r.crime_time || undefined,
    assignedStation: r.assigned_station || undefined,
    estimatedResolutionTime: r.estimated_resolution_time || undefined,
    adminAction: r.admin_action && Object.keys(r.admin_action).length ? r.admin_action : undefined,
  };
}

function getDateThreshold(period: string): string | null {
  if (period === 'all') return null;
  const now = new Date();
  const days = period === '7d' ? 7 : 30;
  now.setDate(now.getDate() - days);
  return now.toISOString();
}

function formatDuration(ms: number) {
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return '<1h';
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function timeBucket(d: Date) {
  const h = d.getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'night';
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
      .select('id, user_id, type, title, description, severity, status, location_lat, location_lng, location_address, crime_location_lat, crime_location_lng, crime_location_address, created_at, status_updates, resolved_at, crime_time, assigned_station, estimated_resolution_time, admin_action');

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

  // Danger zone clusters (~500m grid)
  const dangerZones = useMemo(() => {
    const grid = new Map<string, { lat: number; lng: number; count: number; severitySum: number; recentSum: number }>();
    const now = Date.now();
    filteredReports.forEach(r => {
      const loc = r.crimeLocation || r.location;
      const key = `${loc.lat.toFixed(2)}_${loc.lng.toFixed(2)}`;
      const sev = r.severity === 'high' ? 3 : r.severity === 'medium' ? 2 : 1;
      const ageDays = (now - new Date(r.createdAt).getTime()) / 86400000;
      const recency = Math.max(0, 1 - ageDays / 30); // 1 (today) → 0 (30d+)
      const cur = grid.get(key) || { lat: loc.lat, lng: loc.lng, count: 0, severitySum: 0, recentSum: 0 };
      cur.count += 1;
      cur.severitySum += sev;
      cur.recentSum += recency;
      grid.set(key, cur);
    });
    return Array.from(grid.values()).map(z => {
      // risk score 0..100
      const score = Math.min(100, Math.round(z.count * 8 + z.severitySum * 4 + z.recentSum * 6));
      const level: 'high' | 'medium' | 'low' = score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
      return { ...z, score, level };
    });
  }, [filteredReports]);

  // Time-based safety insights
  const timeInsights = useMemo(() => {
    const buckets = { morning: 0, afternoon: 0, night: 0 };
    filteredReports.forEach(r => {
      const d = new Date(r.crimeTime || r.createdAt);
      buckets[timeBucket(d)]++;
    });
    const total = buckets.morning + buckets.afternoon + buckets.night || 1;
    const max = Math.max(buckets.morning, buckets.afternoon, buckets.night);
    const riskiest = (Object.entries(buckets) as Array<[keyof typeof buckets, number]>)
      .find(([, v]) => v === max)?.[0] || 'night';
    return { buckets, total, riskiest };
  }, [filteredReports]);

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

    // Danger zone overlays
    dangerZones.forEach(z => {
      const color = z.level === 'high' ? '#ef4444' : z.level === 'medium' ? '#f59e0b' : '#22c55e';
      const advice = z.level === 'high'
        ? 'Police surveillance required'
        : z.level === 'medium'
        ? 'Be cautious'
        : 'Safe area';
      L.circle([z.lat, z.lng], {
        radius: 450,
        color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: z.level === 'high' ? '4,4' : undefined,
      })
        .bindTooltip(
          `<div style="padding:6px"><div style="font-weight:700;text-transform:capitalize;color:${color}">${z.level} risk zone</div><div style="font-size:12px">Risk score: ${z.score}/100</div><div style="font-size:12px">${z.count} incident(s)</div><div style="font-size:12px;margin-top:4px;font-style:italic">${advice}</div></div>`,
          { direction: 'top' }
        )
        .addTo(layerGroupRef.current!);
    });

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
      const statusColor = r.status === 'resolved' ? '#22c55e' : r.status === 'investigating' ? '#3b82f6' : r.status === 'rejected' ? '#888' : '#f59e0b';
      let resolutionLine = '';
      if (r.status === 'resolved' && r.resolvedAt) {
        const took = new Date(r.resolvedAt).getTime() - new Date(r.createdAt).getTime();
        resolutionLine = `<div style="font-size:12px;color:#22c55e">Resolved in ${formatDuration(took)}</div>`;
      } else if (r.status === 'investigating') {
        resolutionLine = `<div style="font-size:12px;color:#3b82f6">Under Investigation</div>`;
      } else {
        resolutionLine = `<div style="font-size:12px;color:${statusColor};text-transform:capitalize">${r.status}</div>`;
      }
      const adminLines = [
        r.assignedStation ? `<div style="font-size:11px;color:#888">Station: ${r.assignedStation}</div>` : '',
        r.estimatedResolutionTime ? `<div style="font-size:11px;color:#888">ETA: ${r.estimatedResolutionTime}</div>` : '',
        r.adminAction?.action ? `<div style="font-size:11px;color:#888">Action: ${r.adminAction.action}</div>` : '',
      ].join('');
      const tooltipContent = `
        <div style="padding:6px;min-width:200px">
          <div style="font-weight:700;margin-bottom:4px">${r.title}</div>
          <div style="font-size:12px;color:#888;text-transform:capitalize">${r.type} · ${r.severity} severity</div>
          ${resolutionLine}
          ${adminLines}
          <div style="font-size:11px;color:#888;margin-top:4px">${loc.address || ''}</div>
        </div>
      `;

      L.circleMarker([loc.lat, loc.lng], {
        radius: 6,
        fillColor: statusColor,
        color: '#fff',
        weight: 2,
        fillOpacity: 0.9,
      })
        .bindTooltip(tooltipContent, { permanent: false, direction: 'top', className: 'heatmap-tooltip', offset: [0, -8] })
        .addTo(layerGroupRef.current!);
    });
  }, [filteredPoints, filteredReports, dangerZones]);

  const types = ['all', 'theft', 'assault', 'vandalism', 'robbery', 'fraud', 'harassment'];
  const totalIncidents = areaStats.reduce((sum, a) => sum + a.incidents, 0);
  const highRiskAreas = areaStats.filter(a => a.highestRisk === 'high').length;
  const dangerHigh = dangerZones.filter(z => z.level === 'high').length;
  const { buckets: tb, total: tt, riskiest } = timeInsights;
  const tip = riskiest === 'night'
    ? '⚠️ High risk at night — avoid isolated areas after sunset.'
    : riskiest === 'morning'
    ? '☀️ Most incidents in the morning — stay alert during commute.'
    : '🌤️ Afternoon shows the most activity — be vigilant in busy areas.';

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

        {/* Danger Zones + Time Insights */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold mb-1">Danger Zones</h3>
            <p className="text-sm text-muted-foreground mb-3">Risk-scored clusters based on count, severity & recency</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-emergency/10">
                <div className="text-2xl font-bold text-emergency">{dangerHigh}</div>
                <div className="text-xs text-muted-foreground">High</div>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <div className="text-2xl font-bold text-warning">{dangerZones.filter(z => z.level === 'medium').length}</div>
                <div className="text-xs text-muted-foreground">Medium</div>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <div className="text-2xl font-bold text-success">{dangerZones.filter(z => z.level === 'low').length}</div>
                <div className="text-xs text-muted-foreground">Low</div>
              </div>
            </div>
            {dangerHigh > 0 && (
              <div className="mt-3 text-xs text-emergency font-medium">🚨 {dangerHigh} zone(s) require police surveillance</div>
            )}
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold mb-1">Time-Based Safety Insights</h3>
            <p className="text-sm text-muted-foreground mb-3">When crimes happen most</p>
            <div className="space-y-2">
              {(['morning', 'afternoon', 'night'] as const).map(b => {
                const v = tb[b];
                const pct = tt ? (v / tt) * 100 : 0;
                const label = b === 'morning' ? 'Morning (6–12)' : b === 'afternoon' ? 'Afternoon (12–6)' : 'Night (6–12)';
                return (
                  <div key={b}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize">{label}</span>
                      <span className="text-muted-foreground">{v}</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full ${b === riskiest ? 'bg-emergency' : 'bg-primary'} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-xs font-medium">{tip}</div>
          </div>
        </div>

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
