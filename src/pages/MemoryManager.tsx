import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Brain, FileText, Loader2, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { API_BASE } from '../api/config';

interface MemoryEntry {
  name: string;
  content: string;
  size: number;
  modified: string;
}

type ViewMode = 'list' | 'create' | 'edit';

export function MemoryManager() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [selected, setSelected] = useState<MemoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');

  // Edit form state
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchEntries = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/memory`);
      setEntries(await res.json());
    } catch {
      setFeedback({ type: 'error', message: t('memory.fetchError') });
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchEntries();
      setLoading(false);
    })();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  // CREATE
  const handleCreate = async () => {
    if (!newName.trim()) {
      showFeedback('error', t('memory.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, content: newContent }),
      });
      if (res.ok) {
        showFeedback('success', t('memory.createSuccess'));
        setNewName('');
        setNewContent('');
        setViewMode('list');
        await fetchEntries();
      } else {
        showFeedback('error', t('memory.createError'));
      }
    } catch {
      showFeedback('error', t('memory.createError'));
    } finally {
      setSaving(false);
    }
  };

  // EDIT
  const startEdit = () => {
    if (selected) {
      setEditContent(selected.content);
      setViewMode('edit');
    }
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/memory/${encodeURIComponent(selected.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        showFeedback('success', t('memory.saveSuccess'));
        setViewMode('list');
        await fetchEntries();
        setSelected({ ...selected, content: editContent });
      } else {
        showFeedback('error', t('memory.saveError'));
      }
    } catch {
      showFeedback('error', t('memory.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // DELETE
  const handleDelete = async (name: string) => {
    if (!window.confirm(t('memory.confirmDelete'))) return;
    try {
      const res = await fetch(`${API_BASE}/api/memory/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showFeedback('success', t('memory.deleteSuccess'));
        if (selected?.name === name) setSelected(null);
        setViewMode('list');
        await fetchEntries();
      } else {
        showFeedback('error', t('memory.deleteError'));
      }
    } catch {
      showFeedback('error', t('memory.deleteError'));
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">{t('memory.title')}</h1>
          <p className="mt-1 text-dark-400">~/.hermes/memories/ · {entries.length} {t('memory.files')}</p>
        </div>
        <Button onClick={() => { setViewMode('create'); setSelected(null); }} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          {t('memory.create')}
        </Button>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar list */}
        <div className="lg:col-span-1 space-y-2">
          {entries.map((e) => (
            <button
              key={e.name}
              onClick={() => { setSelected(e); setViewMode('list'); }}
              className={`w-full text-left p-4 rounded-lg border transition-all group ${
                selected?.name === e.name
                  ? 'border-primary-500 bg-primary-500/20'
                  : 'border-dark-700 bg-dark-800 hover:border-dark-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-dark-500 shrink-0" />
                  <span className="font-medium text-dark-200 truncate">{e.name}</span>
                </div>
                <button
                  onClick={(ev) => { ev.stopPropagation(); handleDelete(e.name); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-dark-500 hover:text-red-400 transition-all"
                  title={t('memory.delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-dark-500 mt-1">
                {e.size} {t('memory.bytes')} · {new Date(e.modified).toLocaleDateString()}
              </p>
            </button>
          ))}
          {entries.length === 0 && (
            <div className="text-center py-16">
              <Brain className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-500">{t('memory.noMemory')}</p>
            </div>
          )}
        </div>

        {/* Detail / Create / Edit panel */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            {/* List mode — view selected */}
            {viewMode === 'list' && selected && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-dark-100">{selected.name}</h2>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={startEdit}>
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      {t('memory.edit')}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(selected.name)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      {t('memory.delete')}
                    </Button>
                  </div>
                </div>
                <pre className="text-sm text-dark-300 whitespace-pre-wrap bg-dark-900/50 p-4 rounded-lg max-h-[60vh] overflow-y-auto">
                  {selected.content}
                </pre>
              </div>
            )}

            {/* List mode — nothing selected */}
            {viewMode === 'list' && !selected && (
              <div className="h-full flex items-center justify-center text-center min-h-[300px]">
                <div>
                  <Brain className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                  <p className="text-dark-400">{t('memory.selectFile')}</p>
                </div>
              </div>
            )}

            {/* Create mode */}
            {viewMode === 'create' && (
              <div>
                <h2 className="text-lg font-bold text-dark-100 mb-4">{t('memory.createTitle')}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1">{t('memory.fileName')}</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={t('memory.namePlaceholder')}
                      className="w-full px-3 py-2 rounded-lg bg-dark-900/50 border border-dark-700 text-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1">{t('memory.content')}</label>
                    <textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder={t('memory.contentPlaceholder')}
                      rows={12}
                      className="w-full px-3 py-2 rounded-lg bg-dark-900/50 border border-dark-700 text-dark-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => { setViewMode('list'); setNewName(''); setNewContent(''); }}>
                      <X className="w-3.5 h-3.5 mr-1" />
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={handleCreate} isLoading={saving}>
                      <Save className="w-3.5 h-3.5 mr-1" />
                      {t('common.save')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit mode */}
            {viewMode === 'edit' && selected && (
              <div>
                <h2 className="text-lg font-bold text-dark-100 mb-4">
                  {t('memory.editTitle')}: {selected.name}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1">{t('memory.content')}</label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={14}
                      className="w-full px-3 py-2 rounded-lg bg-dark-900/50 border border-dark-700 text-dark-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => setViewMode('list')}>
                      <X className="w-3.5 h-3.5 mr-1" />
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={handleSaveEdit} isLoading={saving}>
                      <Save className="w-3.5 h-3.5 mr-1" />
                      {t('common.save')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
