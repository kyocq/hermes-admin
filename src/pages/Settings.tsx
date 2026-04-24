import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Save, AlertCircle, Loader2, CheckCircle, Cpu, ChevronDown, Key, Plus, Trash2 } from 'lucide-react';
import { API_BASE } from '../api/config';

interface ModelCatalog {
  providers: {
    id: string;
    label: string;
    models: { id: string; label: string }[];
  }[];
}

interface HermesConfig {
  model: { default: string; provider: string; base_url: string };
  display: { personality: string; compact: boolean; streaming: boolean };
  agent: { max_turns: number; personalities: Record<string, string> };
  memory: { memory_enabled: boolean; user_profile_enabled: boolean };
  terminal: { backend: string; timeout: number };
  tts: { provider: string; enabled: boolean };
  security: { redact_secrets: boolean };
}

export function Settings() {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language || 'zh');
  const [config, setConfig] = useState<HermesConfig | null>(null);
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  useEffect(() => {
    loadConfig();
    loadCatalog();
    loadEnv();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/config`);
      const data = await res.json();
      setConfig({
        ...data,
        model: data.model || { default: '', provider: '', base_url: '' },
        tts: data.tts || { provider: 'edge', enabled: true },
        security: data.security || { redact_secrets: false },
      });
    } catch {
      setError(t('settings.loadFailed'));
    }
  };

  const loadCatalog = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/models/catalog`);
      setCatalog(await res.json());
    } catch {}
  };

  const loadEnv = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/env`);
      const data = await res.json();
      setEnvVars(data.vars || {});
    } catch {}
  };

  const saveEnvVar = async (key: string, value: string) => {
    try {
      await fetch(`${API_BASE}/api/env`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      await loadEnv();
    } catch {}
  };

  const deleteEnvVar = async (key: string) => {
    try {
      await fetch(`${API_BASE}/api/env/${key}`, { method: 'DELETE' });
      await loadEnv();
    } catch {}
  };

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          display: config.display,
          agent: config.agent,
          memory: config.memory,
          terminal: config.terminal,
          tts: config.tts,
          security: config.security,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(t('settings.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = () => setShowConfirm(true);
  const handleConfirmSave = () => { setShowConfirm(false); handleSave(); };

  // Get current provider's models
  const currentProvider = catalog?.providers.find(p => p.id === config?.model?.provider);
  const isCustomProvider = config?.model?.provider === 'custom' || !catalog?.providers.find(p => p.id === config?.model?.provider);

  const personalities = [
    { id: 'helpful', label: '乐于助人' },
    { id: 'concise', label: '简洁' },
    { id: 'technical', label: '技术专家' },
    { id: 'creative', label: '创意' },
    { id: 'teacher', label: '老师' },
    { id: 'kawaii', label: '卡哇伊' },
    { id: 'catgirl', label: '猫娘' },
    { id: 'pirate', label: '海盗' },
    { id: 'noir', label: '黑色' },
    { id: 'uwu', label: 'uwu' },
    { id: 'philosopher', label: '哲学家' },
    { id: 'hype', label: '兴奋' },
  ];

  const ttsProviders = [
    { id: 'edge', label: 'Edge TTS' },
    { id: 'openai', label: 'OpenAI TTS' },
  ];

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-dark-500 animate-spin" />
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500";
  const selectClass = inputClass + " appearance-none cursor-pointer";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">{t('settings.title')}</h1>
          <p className="mt-1 text-dark-400">{t('settings.subtitle')}</p>
        </div>
        <Button onClick={handleSaveClick} isLoading={isSaving} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {saved ? t('settings.saved') : t('settings.save')}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-primary-400" />
              <h3 className="text-lg font-semibold text-dark-100">{t('settings.save')}</h3>
            </div>
            <p className="text-dark-300 mb-6">{t('settings.confirmSave')}</p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setShowConfirm(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleConfirmSave}>
                {t('common.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ═══ Model Configuration ═══ */}
        <Card title={t('settings.model')} className="lg:col-span-2">
          <div className="space-y-4">
            {/* Current model display */}
            <div className="flex items-center gap-3 p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
              <Cpu className="w-5 h-5 text-primary-400" />
              <div>
                <span className="text-sm text-dark-300">{t('settings.currentModel')}: </span>
                <span className="text-sm font-semibold text-primary-400">{config.model.default || '(not set)'}</span>
                <span className="text-sm text-dark-500 ml-2">({config.model.provider})</span>
              </div>
            </div>

            {/* Provider selector */}
            <div>
              <label className="block text-sm text-dark-300 mb-2">{t('settings.provider')}</label>
              <div className="relative">
                <select
                  value={config.model.provider}
                  onChange={(e) => {
                    const provider = e.target.value;
                    const providerData = catalog?.providers.find(p => p.id === provider);
                    const firstModel = providerData?.models?.[0]?.id || '';
                    setConfig({
                      ...config,
                      model: { ...config.model, provider, default: firstModel || config.model.default },
                    });
                  }}
                  className={selectClass}
                >
                  {catalog?.providers.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                  <option value="custom">{t('settings.customProvider')}</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
              </div>
            </div>

            {/* Model selector — dropdown for known providers, input for custom */}
            <div>
              <label className="block text-sm text-dark-300 mb-2">{t('settings.defaultModel')}</label>
              {currentProvider && currentProvider.models.length > 0 && !isCustomProvider ? (
                <div className="relative">
                  <select
                    value={config.model.default}
                    onChange={(e) => setConfig({ ...config, model: { ...config.model, default: e.target.value } })}
                    className={selectClass}
                  >
                    {currentProvider.models.map(m => (
                      <option key={m.id} value={m.id}>{m.label} ({m.id})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
                </div>
              ) : (
                <input
                  type="text"
                  value={config.model.default}
                  onChange={(e) => setConfig({ ...config, model: { ...config.model, default: e.target.value } })}
                  placeholder="e.g. anthropic/claude-sonnet-4"
                  className={inputClass}
                />
              )}
            </div>

            {/* Base URL */}
            <div>
              <label className="block text-sm text-dark-300 mb-2">{t('settings.baseUrl')}</label>
              <input
                type="text"
                value={config.model.base_url}
                onChange={(e) => setConfig({ ...config, model: { ...config.model, base_url: e.target.value } })}
                placeholder="https://api.openrouter.ai/api/v1 (leave empty for default)"
                className={inputClass}
              />
              <p className="text-xs text-dark-500 mt-1">{t('settings.baseUrlHint')}</p>
            </div>
          </div>
        </Card>

        {/* Personality */}
        <Card title={t('settings.personality')}>
          <div className="grid grid-cols-3 gap-2">
            {personalities.map((p) => (
              <button
                key={p.id}
                onClick={() => setConfig({
                  ...config,
                  display: { ...config.display, personality: p.id },
                })}
                className={`p-3 rounded-lg border text-sm transition-all ${
                  config.display.personality === p.id
                    ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                    : 'border-dark-700 bg-dark-800 text-dark-300 hover:border-dark-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Agent Settings */}
        <Card title={t('settings.agentSettings')}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-dark-300 mb-2">{t('settings.maxTurns')}</label>
              <input
                type="number"
                value={config.agent.max_turns}
                onChange={(e) => setConfig({
                  ...config,
                  agent: { ...config.agent, max_turns: parseInt(e.target.value) || 90 },
                })}
                className={inputClass}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-300">{t('settings.streaming')}</span>
              <button
                onClick={() => setConfig({
                  ...config,
                  display: { ...config.display, streaming: !config.display.streaming },
                })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  config.display.streaming ? 'bg-primary-500' : 'bg-dark-700'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  config.display.streaming ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-300">{t('settings.compact')}</span>
              <button
                onClick={() => setConfig({
                  ...config,
                  display: { ...config.display, compact: !config.display.compact },
                })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  config.display.compact ? 'bg-primary-500' : 'bg-dark-700'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  config.display.compact ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </Card>

        {/* Memory & Terminal */}
        <Card title={t('settings.otherSettings')}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-300">{t('settings.persistentMemory')}</span>
              <button
                onClick={() => setConfig({
                  ...config,
                  memory: { ...config.memory, memory_enabled: !config.memory.memory_enabled },
                })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  config.memory.memory_enabled ? 'bg-primary-500' : 'bg-dark-700'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  config.memory.memory_enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-2">{t('settings.terminalBackend')}</label>
              <div className="relative">
                <select
                  value={config.terminal.backend}
                  onChange={(e) => setConfig({
                    ...config,
                    terminal: { ...config.terminal, backend: e.target.value },
                  })}
                  className={selectClass}
                >
                  <option value="local">Local</option>
                  <option value="docker">Docker</option>
                  <option value="singularity">Singularity</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-2">{t('settings.terminalTimeout')}</label>
              <input
                type="number"
                value={config.terminal.timeout}
                onChange={(e) => setConfig({
                  ...config,
                  terminal: { ...config.terminal, timeout: parseInt(e.target.value) || 180 },
                })}
                className={inputClass}
              />
            </div>
          </div>
        </Card>

        {/* TTS Settings */}
        <Card title={t('settings.tts')}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-300">{t('settings.tts')}</span>
              <button
                onClick={() => setConfig({
                  ...config,
                  tts: { ...config.tts, enabled: !config.tts.enabled },
                })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  config.tts.enabled ? 'bg-primary-500' : 'bg-dark-700'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  config.tts.enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-2">{t('settings.ttsProvider')}</label>
              <div className="relative">
                <select
                  value={config.tts.provider}
                  onChange={(e) => setConfig({
                    ...config,
                    tts: { ...config.tts, provider: e.target.value },
                  })}
                  className={selectClass}
                >
                  {ttsProviders.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
              </div>
            </div>
          </div>
        </Card>

        {/* Security Settings */}
        <Card title={t('settings.security')}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-300">{t('settings.redactSecrets')}</span>
              <button
                onClick={() => setConfig({
                  ...config,
                  security: { ...config.security, redact_secrets: !config.security.redact_secrets },
                })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  config.security.redact_secrets ? 'bg-primary-500' : 'bg-dark-700'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  config.security.redact_secrets ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </Card>

        {/* Language */}
        <Card title={t('settings.language')}>
          <div className="flex gap-2">
            {[{ code: 'zh', label: t('lang.zh') }, { code: 'en', label: t('lang.en') }].map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  i18n.changeLanguage(lang.code);
                  localStorage.setItem('hermes-lang', lang.code);
                }}
                className={`px-6 py-3 rounded-lg border transition-all ${
                  language === lang.code
                    ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                    : 'border-dark-700 bg-dark-800 text-dark-300'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </Card>

        {/* API Keys */}
        <Card title={t('settings.apiKeys')} className="lg:col-span-2">
          <div className="space-y-3">
            {/* Existing keys */}
            {Object.entries(envVars).map(([key, maskedVal]) => (
              <div key={key} className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg border border-dark-700/50">
                <Key className="w-4 h-4 text-dark-500 shrink-0" />
                {editingKey === key ? (
                  <>
                    <span className="text-sm font-mono text-primary-400 shrink-0">{key}</span>
                    <input
                      type="password"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      placeholder="Enter new value..."
                      className="flex-1 px-3 py-1.5 bg-dark-900 border border-dark-600 rounded text-dark-100 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => { saveEnvVar(key, editingValue); setEditingKey(null); setEditingValue(''); }}>
                      {t('common.save')}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingKey(null)}>
                      {t('common.cancel')}
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-mono text-dark-300 shrink-0">{key}</span>
                    <span className="flex-1 text-sm text-dark-500 font-mono">{maskedVal}</span>
                    <button
                      onClick={() => { setEditingKey(key); setEditingValue(''); }}
                      className="text-xs text-dark-500 hover:text-primary-400 transition-colors"
                    >
                      {t('settings.updateKey')}
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete ${key}?`)) deleteEnvVar(key); }}
                      className="text-dark-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}

            {/* Add new key */}
            <div className="flex items-center gap-3 p-3 bg-dark-800/30 rounded-lg border border-dashed border-dark-700">
              <Plus className="w-4 h-4 text-dark-500 shrink-0" />
              <input
                type="text"
                value={newEnvKey}
                onChange={(e) => setNewEnvKey(e.target.value.toUpperCase())}
                placeholder="KEY_NAME"
                className="w-48 px-3 py-1.5 bg-dark-900 border border-dark-600 rounded text-dark-100 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="password"
                value={newEnvValue}
                onChange={(e) => setNewEnvValue(e.target.value)}
                placeholder={t('settings.enterValue')}
                className="flex-1 px-3 py-1.5 bg-dark-900 border border-dark-600 rounded text-dark-100 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <Button
                size="sm"
                disabled={!newEnvKey || !newEnvValue}
                onClick={() => { saveEnvVar(newEnvKey, newEnvValue); setNewEnvKey(''); setNewEnvValue(''); }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> {t('common.add')}
              </Button>
            </div>

            <p className="text-xs text-dark-600">{t('settings.apiKeysHint')}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
