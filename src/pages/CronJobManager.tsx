import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Clock, Loader2, RefreshCw, Plus, Trash2, Pause, Play, X } from 'lucide-react';
import { API_BASE } from '../api/config';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  prompt: string;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
}

interface Feedback {
  type: 'success' | 'error';
  message: string;
}

export function CronJobManager() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newSchedule, setNewSchedule] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  }, []);

  const loadJobs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cron`);
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch {
      showFeedback('error', t('cronjobs.toggleError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !newSchedule.trim() || !newPrompt.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/cron`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, schedule: newSchedule, prompt: newPrompt }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('success', t('cronjobs.createSuccess'));
        setShowCreate(false);
        setNewName('');
        setNewSchedule('');
        setNewPrompt('');
        await loadJobs();
      } else {
        showFeedback('error', t('cronjobs.createError'));
      }
    } catch {
      showFeedback('error', t('cronjobs.createError'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('cronjobs.confirmDelete'))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/cron/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showFeedback('success', t('cronjobs.deleteSuccess'));
        await loadJobs();
      } else {
        showFeedback('error', t('cronjobs.deleteError'));
      }
    } catch {
      showFeedback('error', t('cronjobs.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (job: CronJob) => {
    const action = job.enabled ? 'pause' : 'resume';
    setTogglingId(job.id);
    try {
      const res = await fetch(`${API_BASE}/api/cron/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('success', t('cronjobs.toggleSuccess'));
        await loadJobs();
      } else {
        showFeedback('error', t('cronjobs.toggleError'));
      }
    } catch {
      showFeedback('error', t('cronjobs.toggleError'));
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 text-dark-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Feedback toast */}
      {feedback && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all ${
            feedback.type === 'success'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">{t('cronjobs.title')}</h1>
          <p className="mt-1 text-dark-400">
            {jobs.length} {t('cronjobs.jobs')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadJobs}>
            <RefreshCw className="w-4 h-4 mr-1" />
            {t('cronjobs.refresh')}
          </Button>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {showCreate ? t('common.cancel') : t('cronjobs.create')}
          </Button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card title={t('cronjobs.create')}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                {t('cronjobs.name')}
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('cronjobs.namePlaceholder')}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                {t('cronjobs.schedule')}
              </label>
              <input
                type="text"
                value={newSchedule}
                onChange={(e) => setNewSchedule(e.target.value)}
                placeholder={t('cronjobs.schedulePlaceholder')}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                {t('cronjobs.prompt')}
              </label>
              <textarea
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder={t('cronjobs.promptPlaceholder')}
                rows={3}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                isLoading={creating}
                disabled={!newName.trim() || !newSchedule.trim() || !newPrompt.trim()}
              >
                {t('common.create')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Job list */}
      {jobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <Card key={job.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-dark-100 truncate">
                    {job.name || job.id}
                  </h3>
                  <p className="text-sm text-dark-400 mt-1 line-clamp-2">{job.prompt}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs bg-dark-800 px-2 py-0.5 rounded text-dark-400 font-mono">
                      {job.schedule}
                    </span>
                    {job.enabled ? (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                        {t('cronjobs.enabled')}
                      </span>
                    ) : (
                      <span className="text-xs bg-dark-700 text-dark-500 px-2 py-0.5 rounded">
                        {t('cronjobs.paused')}
                      </span>
                    )}
                  </div>
                  {/* Last / Next run */}
                  <div className="flex gap-4 mt-2 text-xs text-dark-500">
                    <span>
                      {t('cronjobs.lastRun')}:{' '}
                      {job.last_run || t('cronjobs.never')}
                    </span>
                    {job.next_run && (
                      <span>
                        {t('cronjobs.nextRun')}: {job.next_run}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(job)}
                    disabled={togglingId === job.id}
                    title={job.enabled ? t('cronjobs.pause') : t('cronjobs.resume')}
                  >
                    {job.enabled ? (
                      <Pause className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <Play className="w-4 h-4 text-green-400" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(job.id)}
                    disabled={deletingId === job.id}
                    title={t('cronjobs.delete')}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-dark-600 mx-auto mb-3" />
            <p className="text-dark-400">{t('cronjobs.noJobs')}</p>
            <p className="text-dark-500 text-sm mt-1">
              {t('cronjobs.createHint')}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
