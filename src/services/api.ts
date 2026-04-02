import { supabase } from '@/integrations/supabase/client';
import type { User, SOSAlert, CrimeReport, EmergencyService, Notification, DashboardStats, HeatmapPoint } from '@/types';

// Reverse geocoding using OpenStreetMap Nominatim
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`, {
      headers: { 'Accept-Language': 'en' }
    });
    const data = await res.json();
    if (data.display_name) {
      const parts = data.display_name.split(',').slice(0, 3).map((s: string) => s.trim());
      return parts.join(', ');
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// Helper to map DB row to CrimeReport
function mapReport(r: any): CrimeReport {
  return {
    _id: r.id,
    userId: r.user_id,
    userName: r.profiles?.name || 'Unknown',
    type: r.type,
    title: r.title,
    description: r.description,
    location: { lat: r.location_lat, lng: r.location_lng, address: r.location_address || undefined },
    crimeLocation: r.crime_location_lat != null ? { lat: r.crime_location_lat, lng: r.crime_location_lng, address: r.crime_location_address || undefined } : undefined,
    status: r.status,
    severity: r.severity,
    mediaNames: r.media_names || undefined,
    createdAt: r.created_at,
    statusUpdates: r.status_updates || [],
  };
}

function mapSOSAlert(a: any): SOSAlert {
  return {
    _id: a.id,
    userId: a.user_id,
    userName: a.profiles?.name || 'Unknown',
    userPhone: a.profiles?.phone || undefined,
    userEmail: a.profiles?.email || undefined,
    location: { lat: a.location_lat, lng: a.location_lng, address: a.location_address || undefined },
    status: a.status,
    createdAt: a.created_at,
    resolvedAt: a.resolved_at || undefined,
  };
}

function mapNotification(n: any): Notification {
  return {
    _id: n.id,
    userId: n.user_id || undefined,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.read,
    createdAt: n.created_at,
  };
}

function mapEmergencyService(s: any): EmergencyService {
  return {
    _id: s.id,
    name: s.name,
    type: s.type,
    location: { lat: s.location_lat, lng: s.location_lng },
    address: s.address,
    phone: s.phone,
    distance: s.distance || undefined,
  };
}

export const api = {
  // =================== SOS ===================
  triggerSOS: async (location: { lat: number; lng: number }): Promise<SOSAlert> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const address = await reverseGeocode(location.lat, location.lng);
    const { data, error } = await supabase.from('sos_alerts').insert({
      user_id: session.user.id,
      location_lat: location.lat,
      location_lng: location.lng,
      location_address: address,
      status: 'active',
    }).select('*, profiles(name, phone, email)').single();

    if (error) throw new Error(error.message);

    // Create notification
    await supabase.from('notifications').insert({
      user_id: session.user.id,
      type: 'sos',
      title: 'SOS Alert Triggered',
      message: `Emergency alert at ${address}`,
    });

    return mapSOSAlert(data);
  },

  getSOSAlerts: async (): Promise<SOSAlert[]> => {
    const { data, error } = await supabase
      .from('sos_alerts')
      .select('*, profiles(name, phone, email)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapSOSAlert);
  },

  updateSOSStatus: async (id: string, status: SOSAlert['status']): Promise<SOSAlert> => {
    const updates: any = { status };
    if (status === 'resolved') updates.resolved_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('sos_alerts')
      .update(updates)
      .eq('id', id)
      .select('*, profiles(name, phone, email)')
      .single();
    if (error) throw new Error(error.message);
    return mapSOSAlert(data);
  },

  // =================== CRIME REPORTS ===================
  getCrimeReports: async (): Promise<CrimeReport[]> => {
    const { data, error } = await supabase
      .from('crime_reports')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapReport);
  },

  getUserReports: async (userId: string): Promise<CrimeReport[]> => {
    const { data, error } = await supabase
      .from('crime_reports')
      .select('*, profiles(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapReport);
  },

  submitCrimeReport: async (reportData: Partial<CrimeReport>): Promise<CrimeReport> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const statusUpdates = [{ status: 'pending', timestamp: new Date().toISOString(), note: 'Report submitted' }];

    const { data, error } = await supabase.from('crime_reports').insert({
      user_id: session.user.id,
      type: reportData.type || 'other',
      title: reportData.title || '',
      description: reportData.description || '',
      location_lat: reportData.location?.lat || 30.3165,
      location_lng: reportData.location?.lng || 78.0322,
      location_address: reportData.location?.address || null,
      crime_location_lat: reportData.crimeLocation?.lat || null,
      crime_location_lng: reportData.crimeLocation?.lng || null,
      crime_location_address: reportData.crimeLocation?.address || null,
      severity: reportData.severity || 'medium',
      media_names: reportData.mediaNames || null,
      status_updates: statusUpdates,
    }).select('*, profiles(name)').single();

    if (error) throw new Error(error.message);

    // Create notification
    await supabase.from('notifications').insert({
      user_id: session.user.id,
      type: 'crime',
      title: 'Report Submitted',
      message: `Your ${reportData.type} report "${reportData.title}" has been submitted.`,
    });

    return mapReport(data);
  },

  updateReportStatus: async (id: string, status: CrimeReport['status'], note?: string): Promise<CrimeReport> => {
    // Get current status_updates
    const { data: current } = await supabase.from('crime_reports').select('status_updates').eq('id', id).single();
    const updates = Array.isArray(current?.status_updates) ? [...current.status_updates] : [];
    updates.push({ status, timestamp: new Date().toISOString(), note });

    const { data, error } = await supabase
      .from('crime_reports')
      .update({ status, status_updates: updates })
      .eq('id', id)
      .select('*, profiles(name)')
      .single();
    if (error) throw new Error(error.message);
    return mapReport(data);
  },

  // =================== HEATMAP ===================
  getHeatmapData: async (): Promise<HeatmapPoint[]> => {
    const { data, error } = await supabase
      .from('crime_reports')
      .select('type, severity, location_lat, location_lng, location_address, crime_location_lat, crime_location_lng, crime_location_address');
    if (error) throw new Error(error.message);

    return (data || []).map(r => ({
      lat: r.crime_location_lat || r.location_lat,
      lng: r.crime_location_lng || r.location_lng,
      intensity: r.severity === 'high' ? 0.9 : r.severity === 'medium' ? 0.6 : 0.3,
      type: r.type,
      areaName: r.crime_location_address || r.location_address || 'Unknown',
      incidentCount: 1,
    }));
  },

  // =================== EMERGENCY SERVICES ===================
  getEmergencyServices: async (): Promise<EmergencyService[]> => {
    const { data, error } = await supabase
      .from('emergency_services')
      .select('*')
      .order('name');
    if (error) throw new Error(error.message);
    return (data || []).map(mapEmergencyService);
  },

  addEmergencyService: async (serviceData: Omit<EmergencyService, '_id'>): Promise<EmergencyService> => {
    const { data, error } = await supabase.from('emergency_services').insert({
      name: serviceData.name,
      type: serviceData.type,
      location_lat: serviceData.location.lat,
      location_lng: serviceData.location.lng,
      address: serviceData.address,
      phone: serviceData.phone,
      distance: serviceData.distance || null,
    }).select().single();
    if (error) throw new Error(error.message);
    return mapEmergencyService(data);
  },

  deleteEmergencyService: async (id: string): Promise<void> => {
    const { error } = await supabase.from('emergency_services').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // =================== NOTIFICATIONS ===================
  getNotifications: async (): Promise<Notification[]> => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapNotification);
  },

  markNotificationRead: async (id: string): Promise<void> => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  },

  markAllNotificationsRead: async (): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id).eq('read', false);
  },

  // =================== DASHBOARD ===================
  getDashboardStats: async (): Promise<DashboardStats> => {
    const { data: reports } = await supabase.from('crime_reports').select('type, status, severity, created_at');
    const { data: alerts } = await supabase.from('sos_alerts').select('status');

    const allReports = reports || [];
    const allAlerts = alerts || [];

    const totalReports = allReports.length;
    const activeAlerts = allAlerts.filter(a => a.status === 'active').length;
    const resolvedCases = allReports.filter(r => r.status === 'approved').length + allAlerts.filter(a => a.status === 'resolved').length;
    const pendingReports = allReports.filter(r => r.status === 'pending').length;

    const typeCounts: Record<string, number> = {};
    allReports.forEach(r => {
      const label = r.type.charAt(0).toUpperCase() + r.type.slice(1);
      typeCounts[label] = (typeCounts[label] || 0) + 1;
    });
    const reportsByType = Object.entries(typeCounts).map(([type, count]) => ({ type, count }));

    const monthCounts: Record<string, number> = {};
    allReports.forEach(r => {
      const d = new Date(r.created_at);
      const month = d.toLocaleString('en', { month: 'short' });
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    const reportsByMonth = Object.entries(monthCounts).map(([month, count]) => ({ month, count }));

    const sevCounts: Record<string, number> = { Low: 0, Medium: 0, High: 0 };
    allReports.forEach(r => {
      const label = r.severity ? r.severity.charAt(0).toUpperCase() + r.severity.slice(1) : 'Medium';
      sevCounts[label] = (sevCounts[label] || 0) + 1;
    });
    const severityDistribution = Object.entries(sevCounts).map(([severity, count]) => ({ severity, count }));

    return { totalReports, activeAlerts, resolvedCases, pendingReports, reportsByType, reportsByMonth, severityDistribution };
  },

  // =================== USERS (admin) ===================
  getUsers: async (): Promise<User[]> => {
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    if (error) throw new Error(error.message);

    const { data: roles } = await supabase.from('user_roles').select('user_id, role');

    return (profiles || []).map(p => {
      const userRoles = (roles || []).filter(r => r.user_id === p.id);
      const isAdmin = userRoles.some(r => r.role === 'admin');
      return {
        _id: p.id,
        name: p.name,
        email: p.email,
        role: isAdmin ? 'admin' as const : 'citizen' as const,
        phone: p.phone || undefined,
        avatar: p.avatar_url || undefined,
        createdAt: p.created_at,
      };
    });
  },
};
