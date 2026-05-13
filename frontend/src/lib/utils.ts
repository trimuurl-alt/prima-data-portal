import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number | string | bigint): string {
  const n = typeof bytes === 'bigint' ? Number(bytes) : Number(bytes);
  if (!n || n === 0) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${(n / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function getErrorMessage(err: any, fallback = 'Something went wrong'): string {
  return err?.response?.data?.message ?? err?.message ?? fallback;
}
