import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Search, Wrench, ChevronRight, Loader2, FileText, Folder } from 'lucide-react';
import { API_BASE } from '../api/config';

interface Skill {
  name: string;
  title: string;
  description: string;
  path: string;
  size: number;
}

interface SkillCategory {
  description: string;
  skills: Skill[];
}

export function SkillManager() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Record<string, SkillCategory>>({});
  const [selected, setSelected] = useState<{ category: string; name: string } | null>(null);
  const [skillDetail, setSkillDetail] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalSkills, setTotalSkills] = useState(0);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/skills`);
      const data = await res.json();
      setCategories(data.categories || {});
      setTotalSkills(data.total_skills || 0);
    } catch (err) {
      console.error('Failed to load skills:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSkillDetail = async (category: string, name: string) => {
    setSelected({ category, name });
    try {
      const res = await fetch(`${API_BASE}/api/skills/${category}/${name}`);
      const data = await res.json();
      setSkillDetail(data);
    } catch {
      setSkillDetail(null);
    }
  };

  const filteredCategories = Object.entries(categories).reduce((acc, [cat, data]) => {
    const filtered = data.skills.filter(s =>
      !search || s.name.includes(search.toLowerCase()) || s.title.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[cat] = { ...data, skills: filtered };
    }
    return acc;
  }, {} as Record<string, SkillCategory>);

  const categoryLabels: Record<string, string> = {
    apple: '🍎 Apple',
    'autonomous-ai-agents': '🤖 AI Agents',
    creative: `🎨 ${t('skills.categories.creative', '创意')}`,
    'data-science': `📊 ${t('skills.categories.dataScience', '数据科学')}`,
    devops: '🔧 DevOps',
    dogfood: '🐕 Dogfood',
    email: `📧 ${t('skills.categories.email', '邮件')}`,
    gaming: `🎮 ${t('skills.categories.gaming', '游戏')}`,
    github: '🐙 GitHub',
    mcp: '🔌 MCP',
    media: `🎬 ${t('skills.categories.media', '媒体')}`,
    mlops: '🧪 MLOps',
    'note-taking': `📝 ${t('skills.categories.noteTaking', '笔记')}`,
    productivity: `💼 ${t('skills.categories.productivity', '效率')}`,
    'red-teaming': `🔴 ${t('skills.categories.redTeaming', '红队')}`,
    research: `🔬 ${t('skills.categories.research', '研究')}`,
    'smart-home': `🏠 ${t('skills.categories.smartHome', '智能家居')}`,
    'social-media': `📱 ${t('skills.categories.socialMedia', '社交媒体')}`,
    'software-development': `💻 ${t('skills.categories.softwareDev', '软件开发')}`,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-dark-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">{t('skills.title')}</h1>
          <p className="mt-1 text-dark-400">{totalSkills} {t('skills.installed')}</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('skills.search')}
            className="pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories list */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
          {Object.entries(filteredCategories).map(([cat, data]) => (
            <Card key={cat} className="overflow-visible">
              <div className="mb-3">
                <h3 className="font-semibold text-dark-100 flex items-center gap-2">
                  {categoryLabels[cat] || cat}
                  <span className="text-xs bg-dark-700 text-dark-400 px-2 py-0.5 rounded-full">{data.skills.length}</span>
                </h3>
                {data.description && <p className="text-xs text-dark-500 mt-1">{data.description}</p>}
              </div>
              <div className="space-y-1">
                {data.skills.map((skill) => (
                  <button
                    key={skill.name}
                    onClick={() => loadSkillDetail(cat, skill.name)}
                    className={`w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between ${
                      selected?.category === cat && selected?.name === skill.name
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'hover:bg-dark-800 text-dark-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3 h-3 flex-shrink-0" />
                      <span className="text-sm truncate">{skill.title || skill.name}</span>
                    </div>
                    <ChevronRight className="w-3 h-3 flex-shrink-0 text-dark-600" />
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Skill detail */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            {skillDetail ? (
              <div className="h-full flex flex-col">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-dark-100">{selected?.name}</h2>
                  <p className="text-sm text-dark-500 mt-1">{skillDetail.category}/{selected?.name}</p>
                </div>
                
                {skillDetail.linked_files && Object.keys(skillDetail.linked_files).length > 0 && (
                  <div className="mb-4 flex gap-2">
                    {Object.entries(skillDetail.linked_files).map(([dir, files]: [string, any]) => (
                      <div key={dir} className="text-xs bg-dark-800 px-3 py-1.5 rounded-lg text-dark-400 flex items-center gap-1">
                        <Folder className="w-3 h-3" />
                        {dir}/ ({Array.isArray(files) ? files.length : 0})
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex-1 overflow-y-auto">
                  <pre className="text-sm text-dark-300 whitespace-pre-wrap font-mono bg-dark-900/50 p-4 rounded-lg max-h-[60vh] overflow-y-auto">
                    {skillDetail.content?.slice(0, 8000) || t('skills.noContent')}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <Wrench className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                  <p className="text-dark-400">{t('skills.selectSkill')}</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
