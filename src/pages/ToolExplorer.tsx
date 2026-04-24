import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Search, Wrench, Loader2, Globe, Monitor, FileCode, Image, Brain, Clock, Cpu, ListTodo } from 'lucide-react';
import { API_BASE } from '../api/config';

interface ToolInfo {
  name: string;
  description: string;
  category: string;
}

const categoryIcons: Record<string, any> = {
  browser: Globe,
  system: Monitor,
  web: Globe,
  file: FileCode,
  media: Image,
  memory: Brain,
  automation: Clock,
  skills: Cpu,
  productivity: ListTodo,
};

export function ToolExplorer() {
  const { t } = useTranslation();
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/tools`);
        const data = await res.json();
        setTools(data.tools || []);
        setCategories(data.categories || {});
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const filtered = tools.filter(tool =>
    (!search || tool.name.includes(search) || tool.description.toLowerCase().includes(search.toLowerCase())) &&
    (!selectedCat || tool.category === selectedCat)
  );

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-dark-500 animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">{t('tools.title')}</h1>
          <p className="mt-1 text-dark-400">{tools.length} {t('tools.available')}</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('tools.search')}
            className="pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCat(null)}
          className={`px-4 py-2 rounded-lg text-sm transition-all ${
            !selectedCat ? 'bg-primary-500/20 text-primary-400 border border-primary-500/50' : 'bg-dark-800 text-dark-400 border border-dark-700'
          }`}
        >
          {t('tools.all')} ({tools.length})
        </button>
        {Object.entries(categories).map(([cat, items]) => {
          const Icon = categoryIcons[cat] || Wrench;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-1.5 ${
                selectedCat === cat ? 'bg-primary-500/20 text-primary-400 border border-primary-500/50' : 'bg-dark-800 text-dark-400 border border-dark-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat} ({items.length})
            </button>
          );
        })}
      </div>

      {/* Tools grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((tool) => {
          const Icon = categoryIcons[tool.category] || Wrench;
          return (
            <Card key={tool.name} className="hover:border-dark-600 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-dark-800 rounded-lg">
                  <Icon className="w-5 h-5 text-primary-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-mono text-sm font-semibold text-dark-100">{tool.name}</h3>
                  <p className="text-xs text-dark-400 mt-1">{tool.description}</p>
                  <span className="inline-block mt-2 text-xs bg-dark-800 text-dark-500 px-2 py-0.5 rounded">{tool.category}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
