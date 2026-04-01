import { User, SOSAlert, CrimeReport, EmergencyService, Notification, DashboardStats, HeatmapPoint } from '@/types';

// Mock users
const users: User[] = [
  { _id: '1', name: 'Rahul Sharma', email: 'rahul@example.com', role: 'citizen', phone: '+91-9412345678', createdAt: '2024-01-15' },
  { _id: '2', name: 'Admin User', email: 'admin@mysafecity.com', role: 'admin', phone: '+91-9410000001', createdAt: '2024-01-01' },
  { _id: '3', name: 'Priya Patel', email: 'priya@example.com', role: 'citizen', phone: '+91-9412345679', createdAt: '2024-02-10' },
  { _id: '4', name: 'Amit Kumar', email: 'amit@example.com', role: 'citizen', phone: '+91-9412345680', createdAt: '2024-03-05' },
  { _id: '5', name: 'Sneha Reddy', email: 'sneha@example.com', role: 'citizen', phone: '+91-9412345681', createdAt: '2024-04-20' },
  { _id: '6', name: 'Deepak Verma', email: 'deepak@example.com', role: 'citizen', phone: '+91-9412345682', createdAt: '2024-05-12' },
  { _id: '7', name: 'Anjali Desai', email: 'anjali@example.com', role: 'citizen', phone: '+91-9412345683', createdAt: '2024-06-18' },
];

const CENTER = { lat: 30.3165, lng: 78.0322 };

const sosAlerts: SOSAlert[] = [
  { _id: 's1', userId: '1', userName: 'Rahul Sharma', userPhone: '+91-9412345678', userEmail: 'rahul@example.com', location: { lat: 30.3165, lng: 78.0322, address: 'Clock Tower, Dehradun' }, status: 'active', createdAt: new Date(Date.now() - 120000).toISOString() },
  { _id: 's2', userId: '3', userName: 'Priya Patel', userPhone: '+91-9412345679', userEmail: 'priya@example.com', location: { lat: 30.3255, lng: 78.0438, address: 'Rajpur Road, Dehradun' }, status: 'responding', createdAt: new Date(Date.now() - 600000).toISOString() },
  { _id: 's3', userId: '4', userName: 'Amit Kumar', userPhone: '+91-9412345680', userEmail: 'amit@example.com', location: { lat: 30.3398, lng: 78.0644, address: 'ISBT Dehradun' }, status: 'resolved', createdAt: new Date(Date.now() - 3600000).toISOString(), resolvedAt: new Date(Date.now() - 1800000).toISOString() },
];

const crimeReports: CrimeReport[] = [
  { _id: 'c1', userId: '1', userName: 'Rahul Sharma', type: 'theft', title: 'Mobile snatched near Clock Tower', description: 'Someone snatched my phone while walking near Clock Tower market area.', location: { lat: 30.3165, lng: 78.0322, address: 'Clock Tower, Dehradun' }, crimeLocation: { lat: 30.3170, lng: 78.0330, address: 'Clock Tower Market, Dehradun' }, status: 'approved', severity: 'medium', createdAt: '2024-12-10T14:30:00Z', mediaNames: ['photo1.jpg'], statusUpdates: [{ status: 'pending', timestamp: '2024-12-10T14:30:00Z' }, { status: 'approved', timestamp: '2024-12-11T09:00:00Z', note: 'Report verified by admin' }] },
  { _id: 'c2', userId: '3', userName: 'Priya Patel', type: 'vandalism', title: 'Car window smashed at Paltan Bazaar', description: 'Parked car had window smashed overnight in Paltan Bazaar parking.', location: { lat: 30.3220, lng: 78.0390, address: 'Paltan Bazaar, Dehradun' }, crimeLocation: { lat: 30.3225, lng: 78.0395, address: 'Paltan Bazaar Parking, Dehradun' }, status: 'pending', severity: 'low', createdAt: '2024-12-12T08:00:00Z', mediaNames: ['damage.jpg', 'parking_cctv.mp4'], statusUpdates: [{ status: 'pending', timestamp: '2024-12-12T08:00:00Z' }] },
  { _id: 'c3', userId: '4', userName: 'Amit Kumar', type: 'assault', title: 'Mugging near Sahastradhara Road', description: 'Was threatened at knifepoint near Sahastradhara Road entrance.', location: { lat: 30.3800, lng: 78.1200, address: 'Sahastradhara Road, Dehradun' }, crimeLocation: { lat: 30.3810, lng: 78.1210, address: 'Sahastradhara Road Entrance, Dehradun' }, status: 'investigating', severity: 'high', createdAt: '2024-12-14T22:15:00Z', statusUpdates: [{ status: 'pending', timestamp: '2024-12-14T22:15:00Z' }, { status: 'investigating', timestamp: '2024-12-15T10:00:00Z', note: 'Police team assigned to investigate' }] },
  { _id: 'c4', userId: '5', userName: 'Sneha Reddy', type: 'robbery', title: 'Shop robbery at Rajpur Road', description: 'Armed robbery at jewellery shop on Rajpur Road.', location: { lat: 30.3255, lng: 78.0438, address: 'Rajpur Road, Dehradun' }, crimeLocation: { lat: 30.3260, lng: 78.0440, address: 'Rajpur Road Jewellers, Dehradun' }, status: 'approved', severity: 'high', createdAt: '2024-12-15T03:45:00Z', mediaNames: ['cctv_footage.mp4'], statusUpdates: [{ status: 'pending', timestamp: '2024-12-15T03:45:00Z' }, { status: 'approved', timestamp: '2024-12-15T12:00:00Z', note: 'FIR registered' }] },
  { _id: 'c5', userId: '6', userName: 'Deepak Verma', type: 'fraud', title: 'ATM skimming device found at Ballupur', description: 'Found a skimming device on ATM machine near Ballupur Chowk.', location: { lat: 30.3350, lng: 78.0500, address: 'Ballupur Chowk, Dehradun' }, crimeLocation: { lat: 30.3355, lng: 78.0505, address: 'SBI ATM, Ballupur Chowk, Dehradun' }, status: 'approved', severity: 'medium', createdAt: '2024-12-16T11:20:00Z', statusUpdates: [{ status: 'pending', timestamp: '2024-12-16T11:20:00Z' }, { status: 'approved', timestamp: '2024-12-16T15:00:00Z' }] },
  { _id: 'c6', userId: '7', userName: 'Anjali Desai', type: 'harassment', title: 'Street harassment near Dehradun Railway Station', description: 'Verbal harassment near the railway station exit.', location: { lat: 30.3183, lng: 78.0250, address: 'Dehradun Railway Station' }, crimeLocation: { lat: 30.3185, lng: 78.0255, address: 'Railway Station Exit Gate, Dehradun' }, status: 'pending', severity: 'medium', createdAt: '2024-12-17T19:30:00Z', statusUpdates: [{ status: 'pending', timestamp: '2024-12-17T19:30:00Z' }] },
];

const notifications: Notification[] = [
  { _id: 'n1', type: 'sos', title: 'SOS Alert Nearby', message: 'An emergency alert was triggered near Clock Tower, Dehradun.', read: false, createdAt: new Date(Date.now() - 60000).toISOString() },
  { _id: 'n2', type: 'crime', title: 'Crime Report Update', message: 'Your report #c1 has been approved by admin.', read: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { _id: 'n3', type: 'alert', title: 'Safety Advisory', message: 'Increased police presence in Rajpur Road area tonight.', read: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { _id: 'n4', type: 'system', title: 'Welcome to MySafeCity', message: 'Your account has been created. Stay safe!', read: true, createdAt: new Date(Date.now() - 172800000).toISOString() },
];

const heatmapPoints: HeatmapPoint[] = [
  { lat: 30.3165, lng: 78.0322, intensity: 0.9, type: 'theft', areaName: 'Clock Tower', incidentCount: 14 },
  { lat: 30.3255, lng: 78.0438, intensity: 0.7, type: 'assault', areaName: 'Rajpur Road', incidentCount: 9 },
  { lat: 30.3220, lng: 78.0390, intensity: 0.5, type: 'vandalism', areaName: 'Paltan Bazaar', incidentCount: 6 },
  { lat: 30.3800, lng: 78.1200, intensity: 0.3, type: 'assault', areaName: 'Sahastradhara Road', incidentCount: 3 },
  { lat: 30.3350, lng: 78.0500, intensity: 0.8, type: 'fraud', areaName: 'Ballupur Chowk', incidentCount: 11 },
  { lat: 30.3183, lng: 78.0250, intensity: 0.9, type: 'robbery', areaName: 'Railway Station', incidentCount: 15 },
  { lat: 30.3400, lng: 78.0650, intensity: 0.6, type: 'harassment', areaName: 'Mussoorie Diversion Road', incidentCount: 7 },
  { lat: 30.3100, lng: 78.0280, intensity: 0.7, type: 'theft', areaName: 'Race Course', incidentCount: 10 },
  { lat: 30.3500, lng: 78.0100, intensity: 0.5, type: 'vandalism', areaName: 'Prem Nagar', incidentCount: 5 },
  { lat: 30.3300, lng: 78.0400, intensity: 0.8, type: 'robbery', areaName: 'Connaught Place', incidentCount: 12 },
  { lat: 30.2900, lng: 78.0200, intensity: 0.4, type: 'theft', areaName: 'Clement Town', incidentCount: 4 },
  { lat: 30.3600, lng: 78.0800, intensity: 0.6, type: 'assault', areaName: 'Rispana Bridge', incidentCount: 8 },
  { lat: 30.2800, lng: 78.0450, intensity: 0.5, type: 'theft', areaName: 'Doiwala', incidentCount: 5 },
  { lat: 30.3050, lng: 78.0150, intensity: 0.4, type: 'harassment', areaName: 'Selaqui', incidentCount: 4 },
  { lat: 30.3450, lng: 78.0300, intensity: 0.7, type: 'robbery', areaName: 'Dalanwala', incidentCount: 9 },
  { lat: 30.3700, lng: 78.0500, intensity: 0.3, type: 'vandalism', areaName: 'Raipur', incidentCount: 3 },
  { lat: 30.3550, lng: 78.0250, intensity: 0.6, type: 'fraud', areaName: 'Dharampur', incidentCount: 7 },
  { lat: 30.3200, lng: 78.0550, intensity: 0.8, type: 'assault', areaName: 'Karanpur', incidentCount: 11 },
];

const mockEmergencyServices: EmergencyService[] = [
  { _id: 'e1', name: 'Kotwali Police Station', type: 'police', location: { lat: 30.3190, lng: 78.0340 }, address: 'Clock Tower, Rajpur Road, Dehradun', phone: '0135-2653100', distance: 0.5 },
  { _id: 'e2', name: 'Race Course Police Station', type: 'police', location: { lat: 30.3100, lng: 78.0280 }, address: 'Race Course, Dehradun', phone: '0135-2624500', distance: 1.2 },
  { _id: 'e3', name: 'Doon Hospital', type: 'hospital', location: { lat: 30.3170, lng: 78.0310 }, address: 'EC Road, Dehradun', phone: '0135-2650610', distance: 0.8 },
  { _id: 'e4', name: 'Max Super Speciality Hospital', type: 'hospital', location: { lat: 30.3400, lng: 78.0650 }, address: 'Mussoorie Diversion Road, Dehradun', phone: '0135-7116800', distance: 2.5 },
  { _id: 'e5', name: 'Dehradun Fire Station', type: 'fire', location: { lat: 30.3200, lng: 78.0350 }, address: 'Chakrata Road, Dehradun', phone: '0135-2653534', distance: 0.6 },
  { _id: 'e6', name: 'Prem Nagar Fire Station', type: 'fire', location: { lat: 30.3500, lng: 78.0100 }, address: 'Prem Nagar, Dehradun', phone: '0135-2770101', distance: 3.5 },
];

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

function computeDashboardStats(): DashboardStats {
  const totalReports = crimeReports.length;
  const activeAlerts = sosAlerts.filter(a => a.status === 'active').length;
  const resolvedCases = crimeReports.filter(r => r.status === 'approved').length + sosAlerts.filter(a => a.status === 'resolved').length;
  const pendingReports = crimeReports.filter(r => r.status === 'pending').length;

  const typeCounts: Record<string, number> = {};
  crimeReports.forEach(r => {
    const label = r.type.charAt(0).toUpperCase() + r.type.slice(1);
    typeCounts[label] = (typeCounts[label] || 0) + 1;
  });
  const reportsByType = Object.entries(typeCounts).map(([type, count]) => ({ type, count }));

  const monthCounts: Record<string, number> = {};
  crimeReports.forEach(r => {
    const d = new Date(r.createdAt);
    const month = d.toLocaleString('en', { month: 'short' });
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });
  const reportsByMonth = Object.entries(monthCounts).map(([month, count]) => ({ month, count }));

  const sevCounts: Record<string, number> = { Low: 0, Medium: 0, High: 0 };
  crimeReports.forEach(r => {
    const label = r.severity ? r.severity.charAt(0).toUpperCase() + r.severity.slice(1) : 'Medium';
    sevCounts[label] = (sevCounts[label] || 0) + 1;
  });
  const severityDistribution = Object.entries(sevCounts).map(([severity, count]) => ({ severity, count }));

  return { totalReports, activeAlerts, resolvedCases, pendingReports, reportsByType, reportsByMonth, severityDistribution };
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const api = {
  login: async (email: string, _password: string): Promise<{ user: User; token: string }> => {
    await delay(500);
    const user = users.find(u => u.email === email);
    if (!user) throw new Error('Invalid credentials');
    return { user, token: 'mock-jwt-token-' + user._id };
  },

  register: async (data: { name: string; email: string; password: string; phone?: string }): Promise<{ user: User; token: string }> => {
    await delay(500);
    const newUser: User = {
      _id: String(Date.now()),
      name: data.name,
      email: data.email,
      role: 'citizen',
      phone: data.phone,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    return { user: newUser, token: 'mock-jwt-token-' + newUser._id };
  },

  triggerSOS: async (location: { lat: number; lng: number }): Promise<SOSAlert> => {
    await delay(300);
    const address = await reverseGeocode(location.lat, location.lng);
    const currentUser = users.find(u => u.role === 'citizen') || users[0];
    const alert: SOSAlert = {
      _id: 'sos-' + Date.now(),
      userId: currentUser._id,
      userName: currentUser.name,
      userPhone: currentUser.phone,
      userEmail: currentUser.email,
      location: { ...location, address },
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    sosAlerts.unshift(alert);
    notifications.unshift({
      _id: 'n-' + Date.now(),
      type: 'sos',
      title: 'New SOS Alert',
      message: `SOS triggered by ${alert.userName} at ${address}`,
      read: false,
      createdAt: new Date().toISOString(),
    });
    return alert;
  },

  getSOSAlerts: async (): Promise<SOSAlert[]> => {
    await delay(300);
    return [...sosAlerts];
  },

  updateSOSStatus: async (id: string, status: SOSAlert['status']): Promise<SOSAlert> => {
    await delay(300);
    const idx = sosAlerts.findIndex(a => a._id === id);
    if (idx === -1) throw new Error('Alert not found');
    sosAlerts[idx] = { ...sosAlerts[idx], status, ...(status === 'resolved' ? { resolvedAt: new Date().toISOString() } : {}) };
    return sosAlerts[idx];
  },

  getCrimeReports: async (): Promise<CrimeReport[]> => {
    await delay(300);
    return [...crimeReports];
  },

  getUserReports: async (userId: string): Promise<CrimeReport[]> => {
    await delay(300);
    return crimeReports.filter(r => r.userId === userId);
  },

  submitCrimeReport: async (data: Partial<CrimeReport>): Promise<CrimeReport> => {
    await delay(500);
    const report: CrimeReport = {
      _id: 'cr-' + Date.now(),
      userId: data.userId || '1',
      userName: data.userName || 'Current User',
      type: data.type || 'other',
      title: data.title || '',
      description: data.description || '',
      location: data.location || { lat: CENTER.lat, lng: CENTER.lng },
      crimeLocation: data.crimeLocation,
      status: 'pending',
      severity: data.severity || 'medium',
      createdAt: new Date().toISOString(),
      mediaNames: data.mediaNames,
      statusUpdates: [{ status: 'pending', timestamp: new Date().toISOString(), note: 'Report submitted' }],
    };
    crimeReports.unshift(report);
    heatmapPoints.push({
      lat: (report.crimeLocation || report.location).lat ?? CENTER.lat,
      lng: (report.crimeLocation || report.location).lng ?? CENTER.lng,
      intensity: report.severity === 'high' ? 0.9 : report.severity === 'medium' ? 0.6 : 0.3,
      type: report.type,
      areaName: (report.crimeLocation || report.location).address || 'Unknown Area',
      incidentCount: 1,
    });
    notifications.unshift({
      _id: 'n-' + Date.now(),
      type: 'crime',
      title: 'New Crime Report',
      message: `New ${report.type} report: ${report.title}`,
      read: false,
      createdAt: new Date().toISOString(),
    });
    return report;
  },

  updateReportStatus: async (id: string, status: CrimeReport['status'], note?: string): Promise<CrimeReport> => {
    await delay(300);
    const idx = crimeReports.findIndex(r => r._id === id);
    if (idx === -1) throw new Error('Report not found');
    crimeReports[idx] = { ...crimeReports[idx], status };
    if (!crimeReports[idx].statusUpdates) crimeReports[idx].statusUpdates = [];
    crimeReports[idx].statusUpdates!.push({ status, timestamp: new Date().toISOString(), note });
    return crimeReports[idx];
  },

  getHeatmapData: async (): Promise<HeatmapPoint[]> => {
    await delay(200);
    return [...heatmapPoints];
  },

  getEmergencyServices: async (): Promise<EmergencyService[]> => {
    await delay(300);
    return [...mockEmergencyServices];
  },

  addEmergencyService: async (data: Omit<EmergencyService, '_id'>): Promise<EmergencyService> => {
    await delay(300);
    const service: EmergencyService = { ...data, _id: 'es-' + Date.now() };
    mockEmergencyServices.push(service);
    return service;
  },

  deleteEmergencyService: async (id: string): Promise<void> => {
    await delay(300);
    const idx = mockEmergencyServices.findIndex(s => s._id === id);
    if (idx !== -1) mockEmergencyServices.splice(idx, 1);
  },

  getNotifications: async (): Promise<Notification[]> => {
    await delay(200);
    return [...notifications];
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    await delay(300);
    return computeDashboardStats();
  },

  getUsers: async (): Promise<User[]> => {
    await delay(300);
    return [...users];
  },
};
