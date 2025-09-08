import React from 'react';

export type Status =
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'cached'
  | 'idle';

export const STATUS_THEME: Record<
  Status,
  { bg: string; dot: string; text: string }
> = {
  queued: { bg: 'bg-slate-100', dot: 'bg-slate-400', text: 'text-slate-700' },
  running: { bg: 'bg-blue-100', dot: 'bg-blue-500', text: 'text-blue-700' },
  success: {
    bg: 'bg-emerald-100',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  failed: { bg: 'bg-rose-100', dot: 'bg-rose-500', text: 'text-rose-700' },
  skipped: {
    bg: 'bg-amber-100',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
  },
  cached: { bg: 'bg-violet-100', dot: 'bg-violet-500', text: 'text-violet-700' },
  idle: { bg: 'bg-gray-100', dot: 'bg-gray-400', text: 'text-gray-700' },
};

interface StatusBadgeProps {
  status: Status;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const theme = STATUS_THEME[status];
  return (
    <span
      className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ${theme.bg} ${theme.text}`}
    >
      <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
      {status}
    </span>
  );
};

export default StatusBadge;

