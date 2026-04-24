import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Activity, MessageSquare, Cpu, DollarSign, Globe } from 'lucide-react';
import { API_BASE } from '../api/config';
import type { Stats } from '../types';

interface SystemInfo {
  cpu: {
    count: number;
    model: string;
    speed: number;
    loadAvg: { '1m': number; '5m': number; '15m': number };
    usagePercent: number;
    cores: { core: number; usage: number }[];
  };
  memory: { total: number; free: number; used: number; usagePercent: number };
  disk: { total: number; used: number; free: number; usagePercent: number };
  os: { platform: string; arch: string; hostname: string; release: string; uptime: number };
  process: { pid: number; uptime: number; memory: { rss: number; heapUsed: number; heapTotal: number }; version: string };
}

const StatCard = ({ icon: Icon, label, value, sub, color }: any) => (
  <Card className="relative overflow-hidden">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-dark-400 text-sm">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${color || 'text-dark-100'}`}>{value}</p>
        {sub && <p className="text-xs text-dark-500 mt-1">{sub}</p>}
      </div>
      <div className="p-2 rounded-lg bg-dark-800">
        <Icon className="w-5 h-5 text-primary-400" />
      </div>
    </div>
  </Card>
);

const ProgressBar = ({ value, max, color }: { value: number; max: number; color: string }) => (
  <div className="w-full bg-dark-800 rounded-full h-2.5">
    <div
      className={`h-2.5 rounded-full transition-all duration-700 ${color}`}
      style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
    />
  </div>
);

const fmtBytes = (b: number) => {
  if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
  if (b >= 1048576) return (b / 1048576).toFixed(0) + ' MB';
  return (b / 1024).toFixed(0) + ' KB';
};

const fmtUptime = (s: number) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [sys, setSys] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, sysRes] = await Promise.all([
          fetch(`${API_BASE}/api/stats`),
          fetch(`${API_BASE}/api/system`),
        ]);
        setStats(await statsRes.json());
        setSys(await sysRes.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const fmtTok = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n || 0);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-dark-800 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-dark-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-dark-100">{t('dashboard.title')}</h1>
        <p className="mt-1 text-dark-400 text-sm">
          {t('dashboard.subtitle')} · {stats?.gateway_state === 'running' ? '✅ Gateway ' + t('dashboard.running') : '⚠️ Gateway ' + t('dashboard.stopped')}
        </p>
      </div>

      {/* Row 1: Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={MessageSquare}
          label={t('dashboard.totalSessions')}
          value={stats?.total_sessions || 0}
          sub={`${stats?.active_sessions || 0} ${t('dashboard.active')}`}
          color="text-blue-400"
        />
        <StatCard
          icon={Activity}
          label={t('dashboard.totalMessages')}
          value={fmtTok(stats?.total_messages || 0)}
          color="text-green-400"
        />
        <StatCard
          icon={Cpu}
          label={t('dashboard.inputTokens')}
          value={fmtTok(stats?.input_tokens || 0)}
          sub={`${t('dashboard.outputTokens')}: ${fmtTok(stats?.output_tokens || 0)}`}
          color="text-purple-400"
        />
        <StatCard
          icon={DollarSign}
          label={t('dashboard.estimatedCost')}
          value={'$' + (stats?.estimated_cost_usd || 0).toFixed(4)}
          color="text-yellow-400"
        />
      </div>

      {/* Row 2: System monitors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Memory */}
        <Card title={t('dashboard.memoryUsage')}>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">
                {fmtBytes(sys?.memory?.used || 0)} / {fmtBytes(sys?.memory?.total || 0)}
              </span>
              <span className="font-bold text-dark-100">{sys?.memory?.usagePercent || 0}%</span>
            </div>
            <ProgressBar value={sys?.memory?.usagePercent || 0} max={100} color={
              (sys?.memory?.usagePercent || 0) > 85 ? 'bg-red-500' :
              (sys?.memory?.usagePercent || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
            } />
            <div className="grid grid-cols-2 gap-2 text-xs text-dark-500">
              <span>Free: {fmtBytes(sys?.memory?.free || 0)}</span>
              <span>Node: {fmtBytes(sys?.process?.memory?.heapUsed || 0)}</span>
            </div>
          </div>
        </Card>

        {/* CPU */}
        <Card title={t('dashboard.cpuUsage')}>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">
                {sys?.cpu?.count || 0} {t('dashboard.cores')} · Load {(sys?.cpu?.loadAvg?.['1m'] || 0).toFixed(2)}
              </span>
              <span className="font-bold text-dark-100">{sys?.cpu?.usagePercent || 0}%</span>
            </div>
            <ProgressBar value={sys?.cpu?.usagePercent || 0} max={100} color={
              (sys?.cpu?.usagePercent || 0) > 80 ? 'bg-red-500' :
              (sys?.cpu?.usagePercent || 0) > 50 ? 'bg-yellow-500' : 'bg-blue-500'
            } />
            {/* Per-core bars */}
            <div className="space-y-1">
              {(sys?.cpu?.cores || []).slice(0, 8).map((c) => (
                <div key={c.core} className="flex items-center gap-2 text-[10px] text-dark-500">
                  <span className="w-5 text-right">C{c.core}</span>
                  <div className="flex-1 bg-dark-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${c.usage > 80 ? 'bg-red-400' : c.usage > 50 ? 'bg-yellow-400' : 'bg-blue-400'}`}
                      style={{ width: `${c.usage}%` }}
                    />
                  </div>
                  <span className="w-7 text-right">{c.usage}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Disk */}
        <Card title={t('dashboard.diskUsage')}>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">
                {fmtBytes(sys?.disk?.used || 0)} / {fmtBytes(sys?.disk?.total || 0)}
              </span>
              <span className="font-bold text-dark-100">{sys?.disk?.usagePercent || 0}%</span>
            </div>
            <ProgressBar value={sys?.disk?.usagePercent || 0} max={100} color={
              (sys?.disk?.usagePercent || 0) > 90 ? 'bg-red-500' :
              (sys?.disk?.usagePercent || 0) > 75 ? 'bg-yellow-500' : 'bg-green-500'
            } />
            <div className="grid grid-cols-2 gap-2 text-xs text-dark-500">
              <span>{t('dashboard.disk')}: {fmtBytes(sys?.disk?.total || 0)}</span>
              <span>Free: {fmtBytes(sys?.disk?.free || 0)}</span>
            </div>
          </div>
        </Card>

        {/* System & Gateway */}
        <Card title={t('dashboard.systemInfo')}>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-400">Gateway</span>
              <span className={`font-medium ${stats?.gateway_state === 'running' ? 'text-green-400' : 'text-red-400'}`}>
                {stats?.gateway_state === 'running' ? t('dashboard.running') : t('dashboard.stopped')}
              </span>
            </div>
            {stats?.platforms && Object.entries(stats.platforms).map(([name, p]) => (
              <div key={name} className="flex justify-between">
                <span className="text-dark-400 flex items-center gap-1.5">
                  <Globe className="w-3 h-3" />{name}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  p.state === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-dark-700 text-dark-400'
                }`}>{p.state}</span>
              </div>
            ))}
            <div className="border-t border-dark-700/50 pt-2 mt-2 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-dark-400">{t('dashboard.osInfo')}</span>
                <span className="text-dark-300 text-xs">{sys?.os?.platform} {sys?.os?.arch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">{t('dashboard.uptime')}</span>
                <span className="text-dark-300 text-xs">{fmtUptime(sys?.os?.uptime || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Node</span>
                <span className="text-dark-300 text-xs">{sys?.process?.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">PID</span>
                <span className="text-dark-300 text-xs">{sys?.process?.pid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">{t('dashboard.backgroundProcesses')}</span>
                <span className="text-dark-300 text-xs">{stats?.background_processes || 0}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 3: Token & Load charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title={t('dashboard.tokenUsage')}>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-dark-400">{t('dashboard.input')}</span>
                <span className="text-dark-200">{(stats?.input_tokens || 0).toLocaleString()}</span>
              </div>
              <ProgressBar value={stats?.input_tokens || 0} max={10000000} color="bg-blue-500" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-dark-400">{t('dashboard.output')}</span>
                <span className="text-dark-200">{(stats?.output_tokens || 0).toLocaleString()}</span>
              </div>
              <ProgressBar value={stats?.output_tokens || 0} max={1000000} color="bg-green-500" />
            </div>
          </div>
        </Card>

        <Card title={t('dashboard.loadAvg')}>
          <div className="grid grid-cols-3 gap-4">
            {sys && [
              { label: '1 min', value: sys.cpu?.loadAvg?.['1m'] || 0 },
              { label: '5 min', value: sys.cpu?.loadAvg?.['5m'] || 0 },
              { label: '15 min', value: sys.cpu?.loadAvg?.['15m'] || 0 },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-2xl font-bold text-dark-100">{item.value.toFixed(2)}</p>
                <p className="text-xs text-dark-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-dark-500 text-center">
            {sys?.cpu?.model} @ {sys?.cpu?.speed} MHz
          </div>
        </Card>
      </div>
    </div>
  );
}
