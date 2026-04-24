import type { ToolInfo, Session, Stats } from '../types';
import { API_BASE } from './config';

export async function getTools(): Promise<ToolInfo[]> {
  const res = await fetch(`${API_BASE}/api/tools`);
  const data = await res.json();
  return data.tools || [];
}

export async function getStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/api/stats`);
  return res.json();
}

export async function getSessions(limit = 50): Promise<Session[]> {
  const res = await fetch(`${API_BASE}/api/sessions?limit=${limit}`);
  return res.json();
}

export async function getMemory() {
  const res = await fetch(`${API_BASE}/api/memory`);
  return res.json();
}
