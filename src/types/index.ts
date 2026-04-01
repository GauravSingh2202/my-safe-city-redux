export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'citizen' | 'admin';
  phone?: string;
  avatar?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface SOSAlert {
  _id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  userEmail?: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  status: 'active' | 'responding' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}

export interface CrimeReport {
  _id: string;
  userId: string;
  userName: string;
  type: 'theft' | 'assault' | 'vandalism' | 'robbery' | 'fraud' | 'harassment' | 'other';
  title: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  crimeLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
  media?: string[];
  mediaNames?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'investigating';
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
  statusUpdates?: { status: string; timestamp: string; note?: string }[];
}

export interface EmergencyService {
  _id: string;
  name: string;
  type: 'police' | 'hospital' | 'fire';
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  phone: string;
  distance?: number;
}

export interface Notification {
  _id: string;
  type: 'sos' | 'crime' | 'system' | 'alert';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  type: string;
  areaName?: string;
  incidentCount?: number;
}

export interface DashboardStats {
  totalReports: number;
  activeAlerts: number;
  resolvedCases: number;
  pendingReports: number;
  reportsByType: { type: string; count: number }[];
  reportsByMonth: { month: string; count: number }[];
  severityDistribution: { severity: string; count: number }[];
}
