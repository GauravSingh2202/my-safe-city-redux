import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Send, Bell, Truck, ShieldCheck, Clock } from 'lucide-react';
import type { SOSAlert } from '@/types';

interface Props {
  alert: SOSAlert;
  compact?: boolean;
}

type Step = {
  key: string;
  label: string;
  description: string;
  reached: boolean;
  at?: string;
  icon: React.ComponentType<{ className?: string }>;
};

function fmtTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SOSStatusTracker({ alert, compact = false }: Props) {
  const isResolved = alert.status === 'resolved';
  const isResponding = alert.status === 'responding' || isResolved;
  const isDelivered = !!alert.deliveredAt || isResponding;
  const isSent = true;

  const steps: Step[] = [
    {
      key: 'sent',
      label: 'Alert Sent',
      description: 'Your emergency request was created',
      reached: isSent,
      at: alert.createdAt,
      icon: Send,
    },
    {
      key: 'delivered',
      label: 'Delivered to Dispatch',
      description: 'Reached the response center',
      reached: isDelivered,
      at: alert.deliveredAt,
      icon: Bell,
    },
    {
      key: 'responding',
      label: 'Help Dispatched',
      description: alert.responderName
        ? `${alert.responderName} is on the way`
        : 'A responder has acknowledged the alert',
      reached: isResponding,
      at: alert.acknowledgedAt,
      icon: Truck,
    },
    {
      key: 'resolved',
      label: 'Resolved',
      description: 'You are marked safe',
      reached: isResolved,
      at: alert.resolvedAt,
      icon: ShieldCheck,
    },
  ];

  return (
    <div className={`glass-card rounded-2xl p-5 ${compact ? '' : 'space-y-4'}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground">SOS at {fmtTime(alert.createdAt)}</p>
          <p className="font-semibold text-sm truncate max-w-[260px]">{alert.location.address || 'Unknown location'}</p>
        </div>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${
            alert.status === 'active'
              ? 'bg-emergency/10 text-emergency'
              : alert.status === 'responding'
              ? 'bg-warning/10 text-warning'
              : 'bg-success/10 text-success'
          }`}
        >
          {alert.status}
        </span>
      </div>

      {(alert.responderName || alert.etaMinutes != null) && !isResolved && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-warning/10 border border-warning/20 mb-3">
          <Truck className="w-5 h-5 text-warning shrink-0" />
          <div className="flex-1">
            {alert.responderName && (
              <p className="text-sm font-semibold">{alert.responderName} is responding</p>
            )}
            {alert.etaMinutes != null && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> ETA ~{alert.etaMinutes} min
              </p>
            )}
          </div>
        </div>
      )}

      <ol className="relative border-l-2 border-border ml-3 space-y-4">
        {steps.map((s, i) => {
          const Icon = s.reached ? CheckCircle2 : s.icon;
          return (
            <motion.li
              key={s.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="ml-5 relative"
            >
              <span
                className={`absolute -left-[34px] top-0 flex items-center justify-center w-7 h-7 rounded-full ring-4 ring-background ${
                  s.reached ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
              </span>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-sm font-medium ${s.reached ? '' : 'text-muted-foreground'}`}>{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtTime(s.at)}</span>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
