'use client';

import React from 'react';
import { isDemoMode } from '@/lib/siteConfig';

interface DemoBadgeProps {
  label?: string;
  className?: string;
}

/**
 * Renders a discreet "Demo Content" badge whenever DEMO_MODE is active.
 * In production mode, this renders nothing.
 */
export default function DemoBadge({ label = 'Demo Content', className = '' }: DemoBadgeProps) {
  if (!isDemoMode) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-500/10 text-amber-600 border border-amber-500/30 select-none ${className}`}
      title="This is sample placeholder content for demonstration purposes and has not been verified."
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      <span>{label}</span>
    </span>
  );
}
