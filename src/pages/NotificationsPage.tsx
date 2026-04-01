import React from 'react';
import { motion } from 'framer-motion';
import { Bell, AlertTriangle, FileText, Info, Shield, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  sos: { icon: AlertTriangle, color: 'text-emergency', bg: 'bg-emergency/10' },
  crime: { icon: FileText, color: 'text-warning', bg: 'bg-warning/10' },
  alert: { icon: Shield, color: 'text-primary', bg: 'bg-primary/10' },
  system: { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted' },
};

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">{unreadCount} unread</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>

        <div className="space-y-3">
          {notifications.map(n => {
            const config = typeConfig[n.type];
            const Icon = config.icon;
            return (
              <motion.div key={n._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => markAsRead(n._id)}
                className={`glass-card rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-all ${!n.read ? 'border-l-4 border-l-primary' : 'opacity-70'}`}>
                <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{n.title}</h3>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5" />}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
