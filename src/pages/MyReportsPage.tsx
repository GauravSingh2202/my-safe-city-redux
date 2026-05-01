import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, MapPin, Clock, CheckCircle, XCircle, Search, Image, ArrowRight, Building2, Timer, Shield } from 'lucide-react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { CrimeReport } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const statusConfig: Record<string, { color: string; icon: any }> = {
  pending: { color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
  approved: { color: 'bg-success/10 text-success border-success/20', icon: CheckCircle },
  resolved: { color: 'bg-success/10 text-success border-success/20', icon: CheckCircle },
  rejected: { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
  investigating: { color: 'bg-primary/10 text-primary border-primary/20', icon: Search },
};

function formatDuration(ms: number) {
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return '<1 hour';
  if (hours < 48) return `${hours} hours`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export default function MyReportsPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<CrimeReport[]>([]);
  const [selected, setSelected] = useState<CrimeReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    const load = () => {
      api.getUserReports(user?._id || '1').then(r => { setReports(r); setLoading(false); });
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user, navigate]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">My Reports</h1>
        <p className="text-muted-foreground mb-8">Track status updates of your submitted reports</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-2xl">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No reports yet</h3>
            <p className="text-muted-foreground mb-4">Submit a crime report to see it here</p>
            <button onClick={() => navigate('/report')} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium">
              Report a Crime
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r, i) => {
              const sc = statusConfig[r.status] || statusConfig.pending;
              const StatusIcon = sc.icon;
              return (
                <motion.div key={r._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => setSelected(r)}
                  className="glass-card-hover rounded-xl p-4 flex items-center gap-4 cursor-pointer group">
                  <FileText className="w-10 h-10 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{r.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {r.type} · {new Date(r.createdAt).toLocaleDateString()}
                      {r.mediaNames && r.mediaNames.length > 0 && (
                        <> · <Image className="w-3 h-3 inline" /> {r.mediaNames.length} file(s)</>
                      )}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${sc.color} capitalize`}>
                    {r.status}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            {selected && (
              <>
                <DialogHeader>
                  <DialogTitle>{selected.title}</DialogTitle>
                  <DialogDescription>Report Details & Status Updates</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-muted-foreground">Type</span><p className="font-medium capitalize">{selected.type}</p></div>
                    <div><span className="text-muted-foreground">Severity</span><p className="font-medium capitalize">{selected.severity}</p></div>
                    <div><span className="text-muted-foreground">Current Status</span><p className="font-medium capitalize">{selected.status}</p></div>
                    <div><span className="text-muted-foreground">Submitted</span><p className="font-medium">{new Date(selected.createdAt).toLocaleString()}</p></div>
                  </div>
                  {/* Resolution timing */}
                  <div className="rounded-lg border border-border p-3 bg-secondary/30">
                    {selected.status === 'resolved' && selected.resolvedAt ? (
                      <div className="flex items-center gap-2 text-success">
                        <Timer className="w-4 h-4" />
                        <span className="font-medium">Resolved in {formatDuration(new Date(selected.resolvedAt).getTime() - new Date(selected.createdAt).getTime())}</span>
                      </div>
                    ) : selected.status === 'investigating' ? (
                      <div className="flex items-center gap-2 text-primary">
                        <Search className="w-4 h-4" />
                        <span className="font-medium">Under Investigation</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium capitalize">Status: {selected.status}</span>
                      </div>
                    )}
                  </div>
                  {/* Admin transparency */}
                  {(selected.assignedStation || selected.estimatedResolutionTime || selected.adminAction?.action) && (
                    <div className="rounded-lg border border-border p-3 space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> ADMIN ACTION</div>
                      {selected.assignedStation && (
                        <div className="flex items-center gap-2 text-sm"><Building2 className="w-4 h-4 text-muted-foreground" /> {selected.assignedStation}</div>
                      )}
                      {selected.estimatedResolutionTime && (
                        <div className="flex items-center gap-2 text-sm"><Timer className="w-4 h-4 text-muted-foreground" /> Estimated: {selected.estimatedResolutionTime}</div>
                      )}
                      {selected.adminAction?.action && (
                        <div className="text-sm"><span className="text-muted-foreground">Action taken: </span>{selected.adminAction.action}</div>
                      )}
                      {selected.adminAction?.note && (
                        <div className="text-xs text-muted-foreground italic">{selected.adminAction.note}</div>
                      )}
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Submitted From</span>
                    <p className="font-medium">{selected.location.address || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">Lat: {selected.location.lat.toFixed(4)}, Lng: {selected.location.lng.toFixed(4)}</p>
                  </div>
                  {selected.crimeLocation && (
                    <div>
                      <span className="text-muted-foreground">Crime Location</span>
                      <p className="font-medium">{selected.crimeLocation.address || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">Lat: {selected.crimeLocation.lat.toFixed(4)}, Lng: {selected.crimeLocation.lng.toFixed(4)}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Description</span>
                    <p className="mt-1">{selected.description}</p>
                  </div>
                  {selected.mediaNames && selected.mediaNames.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Evidence Files</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selected.mediaNames.map((name, i) => (
                          <span key={i} className="text-xs bg-accent px-2 py-1 rounded">{name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selected.statusUpdates && selected.statusUpdates.length > 0 && (
                    <div>
                      <span className="text-muted-foreground font-semibold">Status Timeline</span>
                      <div className="mt-2 space-y-3">
                        {selected.statusUpdates.map((u, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 rounded-full bg-primary" />
                              {i < selected.statusUpdates!.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
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
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
