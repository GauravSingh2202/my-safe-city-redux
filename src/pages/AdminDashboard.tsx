import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, AlertTriangle, FileText, TrendingUp, CheckCircle, Clock, XCircle, Eye, Shield, Activity, ArrowUpRight, ArrowDownRight, MapPin, Zap, User, Calendar, Tag, Plus, Trash2, Building2, Phone, Users, Mail, ShieldAlert, ShieldCheck } from 'lucide-react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { SOSAlert, CrimeReport, DashboardStats, EmergencyService, User as UserType } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const PIE_COLORS = ['hsl(145, 65%, 40%)', 'hsl(38, 92%, 50%)', 'hsl(0, 90%, 50%)'];
const CHART_BLUE = 'hsl(220, 70%, 55%)';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: [0, 0, 0.2, 1] as const } }),
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3">
      <p className="font-semibold text-sm mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

const SERVICE_TYPES = ['police', 'hospital', 'fire'] as const;
const SERVICE_ICONS: Record<string, string> = { police: '🚔', hospital: '🏥', fire: '🚒' };

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [reports, setReports] = useState<CrimeReport[]>([]);
  const [services, setServices] = useState<EmergencyService[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [tab, setTab] = useState<'overview' | 'alerts' | 'reports' | 'services' | 'users'>('overview');
  const [selectedReport, setSelectedReport] = useState<CrimeReport | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);

  const [newService, setNewService] = useState({ name: '', type: 'police' as EmergencyService['type'], address: '', phone: '', lat: '', lng: '' });
  const [adminEdit, setAdminEdit] = useState({ assignedStation: '', estimatedResolutionTime: '', action: '', note: '' });
  const [sosEdit, setSosEdit] = useState({ responderName: '', etaMinutes: '' });

  const fetchData = () => {
    api.getDashboardStats().then(setStats);
    api.getSOSAlerts().then(setAlerts);
    api.getCrimeReports().then(setReports);
    api.getEmergencyServices().then(setServices);
    api.getUsers().then(setAllUsers);
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') { navigate('/login'); return; }
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user, navigate]);

  // Sync admin edit form when selected report changes
  useEffect(() => {
    if (selectedReport) {
      setAdminEdit({
        assignedStation: selectedReport.assignedStation || '',
        estimatedResolutionTime: selectedReport.estimatedResolutionTime || '',
        action: selectedReport.adminAction?.action || '',
        note: selectedReport.adminAction?.note || '',
      });
    }
  }, [selectedReport]);

  const saveAdminAction = async () => {
    if (!selectedReport) return;
    try {
      const updated = await api.updateReportAdmin(selectedReport._id, {
        assignedStation: adminEdit.assignedStation || undefined,
        estimatedResolutionTime: adminEdit.estimatedResolutionTime || undefined,
        adminAction: { action: adminEdit.action, note: adminEdit.note },
      });
      toast.success('Admin action saved');
      setSelectedReport(updated);
      fetchData();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    }
  };

  const handleReportAction = (id: string, action: CrimeReport['status'], note?: string) => {
    api.updateReportStatus(id, action, note || `Report ${action} by admin`).then(() => { fetchData(); toast.success(`Report ${action}`); });
  };

  const handleAlertAction = (id: string, status: SOSAlert['status']) => {
    api.updateSOSStatus(id, status).then(() => { fetchData(); toast.success(`Alert ${status}`); });
  };

  const saveSosResponder = async () => {
    if (!selectedAlert) return;
    try {
      const updated = await api.updateSOSResponder(selectedAlert._id, {
        responderName: sosEdit.responderName || undefined,
        etaMinutes: sosEdit.etaMinutes ? parseInt(sosEdit.etaMinutes, 10) : undefined,
        status: selectedAlert.status === 'active' ? 'responding' : selectedAlert.status,
      });
      toast.success('Responder details saved');
      setSelectedAlert(updated);
      fetchData();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    }
  };

  // Sync SOS responder form when an alert is selected
  useEffect(() => {
    if (selectedAlert) {
      setSosEdit({
        responderName: selectedAlert.responderName || '',
        etaMinutes: selectedAlert.etaMinutes != null ? String(selectedAlert.etaMinutes) : '',
      });
    }
  }, [selectedAlert]);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name || !newService.address || !newService.phone) { toast.error('Please fill all required fields'); return; }
    await api.addEmergencyService({
      name: newService.name, type: newService.type, address: newService.address, phone: newService.phone,
      location: { lat: parseFloat(newService.lat) || 30.3165, lng: parseFloat(newService.lng) || 78.0322 },
    });
    setNewService({ name: '', type: 'police', address: '', phone: '', lat: '', lng: '' });
    fetchData();
    toast.success('Emergency service added');
  };

  const handleDeleteService = async (id: string) => { await api.deleteEmergencyService(id); fetchData(); toast.success('Service removed'); };

  if (!stats) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="ml-3 text-muted-foreground">Loading dashboard...</span>
    </div>
  );

  const statCards = [
    { label: 'Total Reports', value: stats.totalReports, icon: FileText, color: 'text-primary', bgGrad: 'from-primary/10 to-primary/5', trend: '+12%', up: true },
    { label: 'Active Alerts', value: stats.activeAlerts, icon: AlertTriangle, color: 'text-emergency', bgGrad: 'from-emergency/10 to-emergency/5', trend: '-8%', up: false },
    { label: 'Resolved Cases', value: stats.resolvedCases, icon: CheckCircle, color: 'text-success', bgGrad: 'from-success/10 to-success/5', trend: '+23%', up: true },
    { label: 'Total Users', value: allUsers.filter(u => u.role === 'citizen').length, icon: Users, color: 'text-warning', bgGrad: 'from-warning/10 to-warning/5', trend: '+15%', up: true },
  ];

  const resolutionRate = stats.totalReports > 0 ? Math.round((stats.resolvedCases / stats.totalReports) * 100) : 0;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div initial="hidden" animate="visible" className="mb-8">
          <motion.div variants={fadeUp} custom={0} className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Command Center</h1>
              <p className="text-muted-foreground">Real-time city safety monitoring · Dehradun</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-success">
              <Activity className="w-4 h-4 animate-pulse" /> System Online
            </div>
          </motion.div>
        </motion.div>

        {/* Stat Cards */}
        <motion.div initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <motion.div key={s.label} variants={fadeUp} custom={i + 1} className={`stat-card bg-gradient-to-br ${s.bgGrad}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="text-3xl font-bold mb-1">{s.value.toLocaleString()}</div>
              <div className="flex items-center gap-1 text-xs">
                {s.up ? <ArrowUpRight className="w-3 h-3 text-success" /> : <ArrowDownRight className="w-3 h-3 text-emergency" />}
                <span className={s.up ? 'text-success' : 'text-emergency'}>{s.trend}</span>
                <span className="text-muted-foreground">vs last month</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 overflow-x-auto bg-secondary/50 p-1 rounded-xl">
          {(['overview', 'alerts', 'reports', 'services', 'users'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`relative px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200 whitespace-nowrap ${
                tab === t ? 'bg-card shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              }`}>
              {t}
              {t === 'alerts' && alerts.filter(a => a.status === 'active').length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emergency text-emergency-foreground rounded-full text-xs flex items-center justify-center">
                  {alerts.filter(a => a.status === 'active').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold mb-1">Reports by Type</h3>
              <p className="text-sm text-muted-foreground mb-4">Crime category breakdown</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.reportsByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill={CHART_BLUE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold mb-1">Severity</h3>
              <p className="text-sm text-muted-foreground mb-4">Distribution breakdown</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.severityDistribution} dataKey="count" nameKey="severity" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {stats.severityDistribution.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {stats.severityDistribution.map((s, i) => (
                  <div key={s.severity} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i] }} />
                    {s.severity} <span className="text-muted-foreground">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Area Chart */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold mb-1">Monthly Trend</h3>
              <p className="text-sm text-muted-foreground mb-4">Report volume over time</p>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={stats.reportsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" stroke={CHART_BLUE} fill={CHART_BLUE} fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Resolution Rate */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold mb-1">Resolution Rate</h3>
              <p className="text-sm text-muted-foreground mb-4">Case closure performance</p>
              <div className="text-center py-8">
                <div className="text-5xl font-bold text-primary mb-2">{resolutionRate}%</div>
                <div className="text-muted-foreground">resolved</div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div><div className="text-xl font-bold">{stats.totalReports}</div><div className="text-sm text-muted-foreground">Total</div></div>
                <div><div className="text-xl font-bold text-success">{stats.resolvedCases}</div><div className="text-sm text-muted-foreground">Resolved</div></div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="glass-card rounded-2xl p-6 lg:col-span-2">
              <h3 className="font-semibold mb-1">Recent Activity</h3>
              <p className="text-sm text-muted-foreground mb-4">Latest reports and alerts</p>
              <div className="space-y-3">
                {reports.slice(0, 3).map((r, i) => (
                  <div key={r._id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.type} · {r.location.address}</p>
                    </div>
                    <span className="text-xs capitalize font-medium">{r.status}</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ALERTS TAB */}
        {tab === 'alerts' && (
          <div className="space-y-3">
            {alerts.length === 0 && <div className="text-center py-20 text-muted-foreground">No alerts</div>}
            {alerts.map((a, i) => (
              <motion.div key={a._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedAlert(a)}
                className="glass-card-hover rounded-xl p-4 flex items-center gap-4 cursor-pointer">
                <AlertTriangle className={`w-6 h-6 shrink-0 ${a.status === 'active' ? 'text-emergency animate-pulse' : a.status === 'responding' ? 'text-warning' : 'text-success'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{a.userName}</p>
                  <p className="text-sm text-muted-foreground">{a.location.address} · {new Date(a.createdAt).toLocaleString()}</p>
                  {a.userPhone && <p className="text-xs text-muted-foreground mt-0.5"><Phone className="w-3 h-3 inline mr-1" />{a.userPhone}</p>}
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${
                  a.status === 'active' ? 'bg-emergency/10 text-emergency' : a.status === 'responding' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                }`}>{a.status}</span>
                <div onClick={e => e.stopPropagation()} className="flex gap-2">
                  {a.status === 'active' && (
                    <button onClick={() => handleAlertAction(a._id, 'responding')} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-all active:scale-95">Respond</button>
                  )}
                  {a.status === 'responding' && (
                    <button onClick={() => handleAlertAction(a._id, 'resolved')} className="px-4 py-2 bg-success text-success-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-all active:scale-95">Resolve</button>
                  )}
                </div>
              </motion.div>
            ))}

            {/* SOS Alert Detail Dialog */}
            <Dialog open={!!selectedAlert} onOpenChange={open => !open && setSelectedAlert(null)}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                {selectedAlert && (
                  <>
                    <DialogHeader>
                      <DialogTitle>SOS Alert Details</DialogTitle>
                      <DialogDescription>Emergency alert information</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-sm">
                      <div><span className="text-muted-foreground">User Name</span><p className="font-medium">{selectedAlert.userName}</p></div>
                      <div><span className="text-muted-foreground">Status</span><p className="font-medium capitalize">{selectedAlert.status}</p></div>
                      {selectedAlert.userPhone && <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{selectedAlert.userPhone}</p></div>}
                      {selectedAlert.userEmail && <div><span className="text-muted-foreground">Email</span><p className="font-medium">{selectedAlert.userEmail}</p></div>}
                      <div><span className="text-muted-foreground">Location</span><p className="font-medium">{selectedAlert.location.address || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">Lat: {selectedAlert.location.lat.toFixed(4)}, Lng: {selectedAlert.location.lng.toFixed(4)}</p></div>
                      <div><span className="text-muted-foreground">Triggered At</span><p className="font-medium">{new Date(selectedAlert.createdAt).toLocaleString()}</p></div>
                      {selectedAlert.deliveredAt && <div><span className="text-muted-foreground">Delivered At</span><p className="font-medium">{new Date(selectedAlert.deliveredAt).toLocaleString()}</p></div>}
                      {selectedAlert.acknowledgedAt && <div><span className="text-muted-foreground">Acknowledged At</span><p className="font-medium">{new Date(selectedAlert.acknowledgedAt).toLocaleString()}</p></div>}
                      {selectedAlert.resolvedAt && <div><span className="text-muted-foreground">Resolved At</span><p className="font-medium">{new Date(selectedAlert.resolvedAt).toLocaleString()}</p></div>}
                    </div>

                    {selectedAlert.status !== 'resolved' && (
                      <div className="mt-4 p-3 rounded-xl border border-border space-y-3">
                        <p className="text-sm font-semibold">Dispatch Responder</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Responder name (e.g. Unit 12)"
                            value={sosEdit.responderName}
                            onChange={e => setSosEdit(s => ({ ...s, responderName: e.target.value }))}
                            className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                          />
                          <input
                            type="number"
                            min={1}
                            max={240}
                            placeholder="ETA (minutes)"
                            value={sosEdit.etaMinutes}
                            onChange={e => setSosEdit(s => ({ ...s, etaMinutes: e.target.value }))}
                            className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                          />
                        </div>
                        <button
                          onClick={saveSosResponder}
                          className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-95 transition-all"
                        >
                          Save & Mark Responding
                        </button>
                      </div>
                    )}

                    {selectedAlert.status !== 'resolved' && (
                      <div className="flex gap-3 mt-4">
                        {selectedAlert.status === 'active' && (
                          <button onClick={() => { handleAlertAction(selectedAlert._id, 'responding'); setSelectedAlert(null); }}
                            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all active:scale-95">Respond</button>
                        )}
                        <button onClick={() => { handleAlertAction(selectedAlert._id, 'resolved'); setSelectedAlert(null); }}
                          className="flex-1 py-2.5 rounded-xl bg-success text-success-foreground font-semibold text-sm hover:opacity-90 transition-all active:scale-95">Resolve</button>
                      </div>
                    )}
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* REPORTS TAB */}
        {tab === 'reports' && (
          <div className="space-y-3">
            {reports.length === 0 && <div className="text-center py-20 text-muted-foreground">No reports</div>}
            {reports.map((r, i) => (
              <motion.div key={r._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedReport(r)}
                className="glass-card-hover rounded-xl p-4 flex items-center gap-4 cursor-pointer">
                <FileText className="w-6 h-6 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{r.title}</p>
                  <p className="text-sm text-muted-foreground">{r.userName} · {r.type} · {r.location.address}</p>
                </div>
                {typeof r.authenticityScore === 'number' && (
                  <span
                    title={r.authenticityAnalysis?.reasons?.join(' · ') || ''}
                    className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${
                      r.authenticityScore >= 70
                        ? 'bg-success/10 text-success border-success/30'
                        : r.authenticityScore >= 40
                        ? 'bg-warning/10 text-warning border-warning/30'
                        : 'bg-emergency/10 text-emergency border-emergency/30'
                    }`}
                  >
                    {r.authenticityScore >= 70 ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                    {r.authenticityScore}
                  </span>
                )}
                <span className="text-xs capitalize font-medium">{r.status}</span>
                {r.status === 'pending' && (
                  <div onClick={e => e.stopPropagation()} className="flex gap-1">
                    <button onClick={() => handleReportAction(r._id, 'approved')} className="p-2 rounded-lg bg-success/10 hover:bg-success/20 border border-success/20 transition-all active:scale-90"><CheckCircle className="w-4 h-4 text-success" /></button>
                    <button onClick={() => handleReportAction(r._id, 'rejected')} className="p-2 rounded-lg bg-emergency/10 hover:bg-emergency/20 border border-emergency/20 transition-all active:scale-90"><XCircle className="w-4 h-4 text-emergency" /></button>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Report Detail Dialog */}
            <Dialog open={!!selectedReport} onOpenChange={open => !open && setSelectedReport(null)}>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                {selectedReport && (
                  <>
                    <DialogHeader>
                      <DialogTitle>{selectedReport.title}</DialogTitle>
                      <DialogDescription>Crime Report Details</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div><span className="text-muted-foreground">Type</span><p className="font-medium capitalize">{selectedReport.type}</p></div>
                        <div><span className="text-muted-foreground">Severity</span><p className="font-medium capitalize">{selectedReport.severity}</p></div>
                        <div><span className="text-muted-foreground">Status</span><p className="font-medium capitalize">{selectedReport.status}</p></div>
                        <div><span className="text-muted-foreground">Date</span><p className="font-medium">{new Date(selectedReport.createdAt).toLocaleDateString()}</p></div>
                        <div><span className="text-muted-foreground">Reported By</span><p className="font-medium">{selectedReport.userName}</p></div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Submitted From</span>
                        <p className="font-medium">{selectedReport.location.address || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">Lat: {selectedReport.location.lat.toFixed(4)}, Lng: {selectedReport.location.lng.toFixed(4)}</p>
                      </div>
                      {selectedReport.crimeLocation && (
                        <div>
                          <span className="text-muted-foreground">Crime Location</span>
                          <p className="font-medium">{selectedReport.crimeLocation.address || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">Lat: {selectedReport.crimeLocation.lat.toFixed(4)}, Lng: {selectedReport.crimeLocation.lng.toFixed(4)}</p>
                        </div>
                      )}
                      <div><span className="text-muted-foreground">Description</span><p className="mt-1">{selectedReport.description}</p></div>
                      {selectedReport.mediaNames && selectedReport.mediaNames.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Evidence</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedReport.mediaNames.map((name, i) => (<span key={i} className="text-xs bg-accent px-2 py-1 rounded">{name}</span>))}
                          </div>
                        </div>
                      )}
                      {selectedReport.statusUpdates && selectedReport.statusUpdates.length > 0 && (
                        <div>
                          <span className="text-muted-foreground font-semibold">Status Timeline</span>
                          <div className="mt-2 space-y-3">
                            {selectedReport.statusUpdates.map((u, i) => (
                              <div key={i} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                  <div className="w-3 h-3 rounded-full bg-primary" />
                                  {i < selectedReport.statusUpdates!.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                                </div>
                                <div>
                                  <p className="font-medium capitalize text-sm">{u.status}</p>
                                  <p className="text-xs text-muted-foreground">{new Date(u.timestamp).toLocaleString()}</p>
                                  {u.note && <p className="text-xs mt-0.5 text-muted-foreground italic">{u.note}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedReport.status === 'pending' && (
                        <div className="flex gap-3 mt-4">
                          <button onClick={() => { handleReportAction(selectedReport._id, 'approved', 'Report approved by admin'); setSelectedReport(null); }}
                            className="flex-1 py-2.5 rounded-xl bg-success text-success-foreground font-semibold text-sm hover:opacity-90 transition-all active:scale-95">Approve</button>
                          <button onClick={() => { handleReportAction(selectedReport._id, 'investigating', 'Investigation initiated'); setSelectedReport(null); }}
                            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all active:scale-95">Investigate</button>
                          <button onClick={() => { handleReportAction(selectedReport._id, 'rejected', 'Report rejected by admin'); setSelectedReport(null); }}
                            className="flex-1 py-2.5 rounded-xl bg-emergency text-emergency-foreground font-semibold text-sm hover:opacity-90 transition-all active:scale-95">Reject</button>
                        </div>
                      )}
                      {/* Admin transparency editor */}
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        <div className="text-xs font-semibold text-muted-foreground">ADMIN ACTION & TRANSPARENCY</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Assigned Station</label>
                            <input value={adminEdit.assignedStation} onChange={e => setAdminEdit(p => ({ ...p, assignedStation: e.target.value }))}
                              placeholder="e.g. Dehradun Central PS"
                              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Estimated Resolution</label>
                            <input value={adminEdit.estimatedResolutionTime} onChange={e => setAdminEdit(p => ({ ...p, estimatedResolutionTime: e.target.value }))}
                              placeholder="e.g. 3 days"
                              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Action Taken</label>
                          <input value={adminEdit.action} onChange={e => setAdminEdit(p => ({ ...p, action: e.target.value }))}
                            placeholder="e.g. FIR registered, patrol dispatched"
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Internal Note</label>
                          <textarea value={adminEdit.note} onChange={e => setAdminEdit(p => ({ ...p, note: e.target.value }))}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={saveAdminAction}
                            className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all active:scale-95">Save Admin Action</button>
                          {selectedReport.status !== 'resolved' && (
                            <button onClick={() => { handleReportAction(selectedReport._id, 'resolved', 'Case resolved by admin'); setSelectedReport(null); }}
                              className="flex-1 py-2 rounded-lg bg-success text-success-foreground font-semibold text-sm hover:opacity-90 transition-all active:scale-95">Mark Resolved</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* SERVICES TAB */}
        {tab === 'services' && (
          <div className="space-y-6">
            <form onSubmit={handleAddService} className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Add Emergency Service</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Name *</label>
                  <input value={newService.name} onChange={e => setNewService(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Central Police Station" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Type *</label>
                  <select value={newService.type} onChange={e => setNewService(p => ({ ...p, type: e.target.value as EmergencyService['type'] }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {SERVICE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Address *</label>
                  <input value={newService.address} onChange={e => setNewService(p => ({ ...p, address: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Full address" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Phone *</label>
                  <input value={newService.phone} onChange={e => setNewService(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="0135-XXXXXXX" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Latitude</label>
                  <input value={newService.lat} onChange={e => setNewService(p => ({ ...p, lat: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="30.3165" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Longitude</label>
                  <input value={newService.lng} onChange={e => setNewService(p => ({ ...p, lng: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="78.0322" />
                </div>
              </div>
              <button type="submit" className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Service
              </button>
            </form>

            <div className="space-y-3">
              {services.map((s, i) => (
                <motion.div key={s._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-xl p-4 flex items-center gap-4">
                  <span className="text-2xl">{SERVICE_ICONS[s.type] || '📍'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.address}</p>
                    <p className="text-sm text-muted-foreground">{s.phone}</p>
                  </div>
                  <span className="text-xs capitalize bg-accent px-2 py-1 rounded">{s.type}</span>
                  <button onClick={() => handleDeleteService(s._id)} className="p-2 rounded-lg hover:bg-emergency/10 transition-all text-muted-foreground hover:text-emergency active:scale-90">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <div className="space-y-3">
            <div className="glass-card rounded-xl p-4 mb-4">
              <span className="font-semibold">Total Registered Users: {allUsers.length}</span>
              <span className="text-sm text-muted-foreground ml-2">({allUsers.filter(u => u.role === 'citizen').length} citizens, {allUsers.filter(u => u.role === 'admin').length} admins)</span>
            </div>
            {allUsers.map((u, i) => (
              <motion.div key={u._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl p-4 flex items-center gap-4">
                <User className="w-10 h-10 text-primary bg-primary/10 rounded-full p-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="w-3 h-3" /> {u.email}
                    {u.phone && <><Phone className="w-3 h-3 ml-2" /> {u.phone}</>}
                  </p>
                </div>
                <span className={`text-xs capitalize font-medium px-2 py-1 rounded ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-accent'}`}>{u.role}</span>
                <span className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
