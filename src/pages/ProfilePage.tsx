
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Shield, Calendar, FileText, AlertTriangle, CheckCircle, Clock, XCircle, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import type { CrimeReport, SOSAlert } from '@/types';
import ProfileEditDialog from '@/components/ProfileEditDialog';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<CrimeReport[]>([]);
  const [sosAlerts, setSOSAlerts] = useState<SOSAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      if (user?.role === 'admin') {
        const [reps, sos] = await Promise.all([api.getCrimeReports(), api.getSOSAlerts()]);
        setReports(reps);
        setSOSAlerts(sos);
      } else if (user) {
        const reps = await api.getUserReports(user._id);
        setReports(reps);
      }
    } catch (err) {
      console.error('Failed to load profile data', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  // Stats for admin
  const totalReports = reports.length;
  const pending = reports.filter(r => r.status === 'pending').length;
  const investigating = reports.filter(r => r.status === 'investigating').length;
  const approved = reports.filter(r => r.status === 'approved').length;
  const rejected = reports.filter(r => r.status === 'rejected').length;
  const totalSOS = sosAlerts.length;
  const activeSOS = sosAlerts.filter(a => a.status === 'active').length;
  const resolvedSOS = sosAlerts.filter(a => a.status === 'resolved').length;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'investigating': return <AlertTriangle className="w-4 h-4 text-blue-500" />;
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      investigating: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      approved: 'bg-green-500/10 text-green-600 border-green-500/20',
      rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
    };
    return `px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status] || 'bg-muted text-muted-foreground border-border'}`;
  };

  return (
    <div className="min-h-screen pt-[var(--nav-height)] pb-24">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-primary" />
              )}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold">{user.name || 'User'}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 justify-center sm:justify-start">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isAdmin ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'}`}>
                  <Shield className="w-3 h-3 inline mr-1" />
                  {isAdmin ? 'Admin' : 'Citizen'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-border/50">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{user.email || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{user.phone || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="text-sm font-medium">{new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Admin Stats */}
        {isAdmin && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-lg font-bold mb-4">Case Management Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Reports', value: totalReports, icon: FileText, color: 'text-primary' },
                { label: 'Pending', value: pending, icon: Clock, color: 'text-yellow-500' },
                { label: 'Investigating', value: investigating, icon: AlertTriangle, color: 'text-blue-500' },
                { label: 'Approved', value: approved, icon: CheckCircle, color: 'text-green-500' },
                { label: 'Rejected', value: rejected, icon: XCircle, color: 'text-red-500' },
                { label: 'Total SOS', value: totalSOS, icon: AlertTriangle, color: 'text-orange-500' },
                { label: 'Active SOS', value: activeSOS, icon: AlertTriangle, color: 'text-red-500' },
                { label: 'Resolved SOS', value: resolvedSOS, icon: CheckCircle, color: 'text-green-500' },
              ].map((stat) => (
                <div key={stat.label} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Reports list */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-lg font-bold mb-4">
            {isAdmin ? 'All Crime Reports' : 'My Crime Reports'}
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No crime reports found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.slice(0, 10).map((report) => (
                <div key={report._id} className="glass-card rounded-xl p-4 flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {statusIcon(report.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold truncate">{report.title}</h3>
                      <span className={statusBadge(report.status)}>{report.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {report.type.charAt(0).toUpperCase() + report.type.slice(1)} • {report.location?.address || 'Unknown location'} • {new Date(report.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    report.severity === 'high' ? 'bg-red-500/10 text-red-600' :
                    report.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-600' :
                    'bg-green-500/10 text-green-600'
                  }`}>
                    {report.severity}
                  </span>
                </div>
              ))}
              {reports.length > 10 && (
                <p className="text-center text-sm text-muted-foreground">
                  Showing 10 of {reports.length} reports
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
