'use client';

import { motion } from 'framer-motion';
import { Loader, Users, ClipboardList, Wallet, BarChart3 } from 'lucide-react';

const SkeletonCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`glass-panel p-4 md:p-5 rounded-2xl border border-slate-700/50 ${className}`}>
    {children}
  </div>
);

const MetricSkeleton = () => (
  <div className="flex items-center space-x-4">
    <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center">
      <div className="w-6 h-6 bg-slate-600/70 rounded"></div>
    </div>
    <div className="space-y-2">
      <div className="h-4 w-24 bg-slate-600/70 rounded"></div>
      <div className="h-6 w-16 bg-slate-600/70 rounded"></div>
    </div>
  </div>
);

const ChartSkeleton = () => (
  <div className="h-64 md:h-80 w-full bg-slate-800/30 rounded-lg p-4 flex items-end space-x-2">
    {[...Array(12)].map((_, i) => (
      <div key={i} style={{ height: `${Math.random() * 60 + 10}%` }} className="w-full bg-slate-700/50 rounded-t-md"></div>
    ))}
  </div>
);

const ListSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-slate-700/50 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-3/4 bg-slate-600/70 rounded"></div>
          <div className="h-3 w-1/2 bg-slate-600/70 rounded"></div>
        </div>
        <div className="h-3 w-12 bg-slate-600/70 rounded"></div>
      </div>
    ))}
  </div>
);

export default function HRLoading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-slate-700/50 rounded-md" />
          <div className="h-4 w-64 bg-slate-700/50 rounded-md mt-3" />
        </div>
        <div className="h-10 w-36 bg-slate-700/50 rounded-lg" />
      </div>

      {/* Metrics Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <SkeletonCard><MetricSkeleton /></SkeletonCard>
        <SkeletonCard><MetricSkeleton /></SkeletonCard>
        <SkeletonCard><MetricSkeleton /></SkeletonCard>
        <SkeletonCard><MetricSkeleton /></SkeletonCard>
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <SkeletonCard className="lg:col-span-2">
          <div className="h-6 w-40 bg-slate-700/50 rounded-md mb-4"></div>
          <ChartSkeleton />
        </SkeletonCard>
        <SkeletonCard>
          <div className="h-6 w-32 bg-slate-700/50 rounded-md mb-4"></div>
          <ListSkeleton />
        </SkeletonCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <SkeletonCard>
          <div className="h-6 w-32 bg-slate-700/50 rounded-md mb-4"></div>
          <ListSkeleton />
        </SkeletonCard>
        <SkeletonCard>
          <div className="h-6 w-40 bg-slate-700/50 rounded-md mb-4"></div>
          <div className="h-40 w-full bg-slate-800/30 rounded-lg"></div>
        </SkeletonCard>
        <SkeletonCard>
          <div className="h-6 w-24 bg-slate-700/50 rounded-md mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 w-full bg-slate-700/50 rounded-lg"></div>
            <div className="h-10 w-full bg-slate-700/50 rounded-lg"></div>
            <div className="h-10 w-full bg-slate-700/50 rounded-lg"></div>
          </div>
        </SkeletonCard>
      </div>
    </motion.div>
  );
}
