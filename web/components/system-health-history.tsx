'use client';

import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/glass-panel';
import { Badge } from '@/components/ui/badge';
import { Timer } from 'lucide-react';

export interface HealthHistoryEntry {
  timestamp: Date;
  status: string;
  responseTime: number;
}

interface SystemHealthHistoryProps {
  healthHistory: HealthHistoryEntry[];
}

function getHistoryBarHeightClass(heightPercent: number) {
  const bucket = Math.max(5, Math.min(100, Math.round(heightPercent / 10) * 10));
  const sizeMap: Record<number, string> = {
    5: 'h-[5%]',
    10: 'h-[10%]',
    20: 'h-[20%]',
    30: 'h-[30%]',
    40: 'h-[40%]',
    50: 'h-[50%]',
    60: 'h-[60%]',
    70: 'h-[70%]',
    80: 'h-[80%]',
    90: 'h-[90%]',
    100: 'h-full',
  };

  return sizeMap[bucket] ?? 'h-[5%]';
}

export function SystemHealthHistory({ healthHistory }: SystemHealthHistoryProps) {
  if (healthHistory.length <= 2) {
    return null;
  }

  return (
    <GlassPanel className="overflow-hidden">
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card)]">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2 tracking-tighter">
          <Timer className="w-5 h-5 text-emerald-500" />
          Global Latency Map (Historical)
        </h3>
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">30m Window</div>
      </div>
      <div className="p-8">
        <div className="flex items-end gap-1.5 h-32">
          {healthHistory.map((entry, index) => {
            const maxTime = Math.max(...healthHistory.map((item) => item.responseTime), 1);
            const height = (entry.responseTime / maxTime) * 100;
            return (
              <motion.div
                key={`${entry.timestamp.toISOString()}-${index}`}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                className="flex-1 rounded-t-sm group relative"
              >
                <div
                  className={`w-full transition-all duration-300 ${entry.status === 'healthy' || entry.status === 'ok'
                      ? 'bg-primary/20 hover:bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]'
                      : 'bg-red-500/50'
                    } ${getHistoryBarHeightClass(Math.max(height, 5))}`}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[var(--muted)] backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-foreground border border-[var(--border)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    {entry.responseTime}ms
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          <span>Buffer Start</span>
          <span className="text-primary/40 tracking-[0.5em]">Realtime Telemetry Stream</span>
          <span>Buffer End</span>
        </div>
      </div>
    </GlassPanel>
  );
}

export function SystemHealthHistoryPlaceholder() {
  return (
    <GlassPanel className="overflow-hidden">
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card)]">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2 tracking-tighter">
          <Timer className="w-5 h-5 text-emerald-500" />
          Global Latency Map (Historical)
        </h3>
        <Badge variant="outline" className="text-[10px] border-[var(--border)]">
          Loading
        </Badge>
      </div>
      <div className="p-8">
        <div className="h-32 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] animate-pulse" />
        <div className="flex items-center justify-between mt-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          <span>Buffer Start</span>
          <span className="text-primary/40 tracking-[0.5em]">Lazy Loaded Telemetry</span>
          <span>Buffer End</span>
        </div>
      </div>
    </GlassPanel>
  );
}