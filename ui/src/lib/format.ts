import { formatDistanceToNow, format, formatDuration, intervalToDuration } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatRelativeTimestamp(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) {
    return 'n/a';
  }
  return formatDistanceToNow(new Date(ms), { addSuffix: true, locale: fr });
}

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) {
    return 'n/a';
  }
  return format(new Date(ms), 'dd/MM/yyyy HH:mm:ss', { locale: fr });
}

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) {
    return 'n/a';
  }
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const duration = intervalToDuration({ start: 0, end: ms });
  return formatDuration(duration, { locale: fr });
}

export function formatCronSchedule(schedule: { kind: string; expr?: string; everyMs?: number; at?: string }): string {
  if (schedule.kind === 'cron' && schedule.expr) {
    return `Cron: ${schedule.expr}`;
  }
  if (schedule.kind === 'every' && schedule.everyMs) {
    const mins = Math.round(schedule.everyMs / 60000);
    if (mins < 60) return `Every ${mins}min`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `Every ${hours}h`;
    const days = Math.round(hours / 24);
    return `Every ${days}d`;
  }
  if (schedule.kind === 'at' && schedule.at) {
    return `At ${schedule.at}`;
  }
  return 'Unknown schedule';
}
