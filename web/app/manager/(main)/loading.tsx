'use client';

import { motion } from 'framer-motion';
import { Loader, LayoutDashboard } from 'lucide-react';

const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <div className={`glass-panel rounded-2xl p-4 md:p-6 border-l-4 border-t-2 border-slate-700/50 ${className}`}>
    <div className="animate-pulse flex flex-col h-full">
      <div className="flex justify-between items-start">
        <div className="w-3/5 h-5 bg-slate-700/50 rounded-md" />
        <div className="w-10 h-10 bg-slate-700/50 rounded-xl" />
      </div>
      <div className="mt-auto space-y-3">
        <div className="w-1/2 h-8 bg-slate-600/50 rounded-md" />
        <div className="w-full h-4 bg-slate-700/50 rounded-md" />
      </div>
    </div>
  </div>
);

const SkeletonListItem = ({ delay }: { delay: number }) => (
  <motion.div
    className="flex items-center gap-4 px-5 py-4"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: delay * 0.1 }}
  >
    <div className="w-10 h-10 bg-slate-700/50 rounded-full animate-pulse" />
    <div className="flex-1 space-y-2">
      <div className="w-3/4 h-4 bg-slate-700/50 rounded-md animate-pulse" />
      <div className="w-1/2 h-3 bg-slate-700/50 rounded-md animate-pulse" />
    </div>
    <div className="w-16 h-8 bg-slate-700/50 rounded-lg animate-pulse" />
  </motion.div>
);

export default function ManagerLoading() {
  return (
    <div className="w-full h-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2 animate-pulse">
            <div className="w-64 h-10 bg-slate-700/50 rounded-lg" />
            <div className="w-80 h-5 bg-slate-700/50 rounded-md" />
          </div>
          <div className="w-40 h-12 bg-slate-700/50 rounded-xl animate-pulse" />
        </div>

        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-40" />
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel rounded-2xl h-96 border-l-4 border-t-2 border-slate-700/50">
            <div className="p-5 border-b border-slate-700/50 animate-pulse">
              <div className="w-48 h-6 bg-slate-700/50 rounded-md" />
            </div>
            <div className="divide-y divide-slate-800/80">
              <SkeletonListItem delay={0} />
              <SkeletonListItem delay={1} />
              <SkeletonListItem delay={2} />
              <SkeletonListItem delay={3} />
            </div>
          </div>
          <div className="glass-panel rounded-2xl h-96 border-l-4 border-t-2 border-slate-700/50">
            <div className="p-5 border-b border-slate-700/50 animate-pulse">
              <div className="w-40 h-6 bg-slate-700/50 rounded-md" />
            </div>
            <div className="divide-y divide-slate-800/80">
              <SkeletonListItem delay={0.5} />
              <SkeletonListItem delay={1.5} />
              <SkeletonListItem delay={2.5} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Fallback Loader centered */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-20 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, type: 'spring' }}
          className="flex items-center gap-3 glass-panel p-4 rounded-2xl"
        >
          <Loader className="w-6 h-6 text-sky-300 animate-spin" />
          <span className="text-lg font-semibold text-slate-300">Loading Portal...</span>
        </motion.div>
      </div>
    </div>
  );
}
