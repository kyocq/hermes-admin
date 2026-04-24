import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './components/layout/Sidebar';
import { NotificationContainer } from './components/layout/Notification';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { Dashboard } from './pages/Dashboard';
import { Chat } from './pages/Chat';
import { CronJobManager } from './pages/CronJobManager';
import { SkillManager } from './pages/SkillManager';
import { ToolExplorer } from './pages/ToolExplorer';
import { MemoryManager } from './pages/MemoryManager';
import { Settings } from './pages/Settings';
import { Sun, Moon, Globe } from 'lucide-react';
import './i18n';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function Header() {
  const { theme, toggle } = useTheme();
  const { i18n } = useTranslation();

  const switchLang = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(next);
    localStorage.setItem('hermes-lang', next);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Language */}
      <button
        onClick={switchLang}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-dark-800 border border-dark-700 text-dark-300 hover:text-dark-100 hover:border-dark-500 transition-colors"
        title={i18n.language === 'zh' ? 'Switch to English' : '切换到中文'}
      >
        <Globe className="w-3.5 h-3.5" />
        {i18n.language === 'zh' ? 'EN' : '中'}
      </button>

      {/* Theme */}
      <button
        onClick={toggle}
        className="p-1.5 rounded-lg bg-dark-800 border border-dark-700 text-dark-300 hover:text-dark-100 hover:border-dark-500 transition-colors"
        title={theme === 'dark' ? '切换亮色' : '切换深色'}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex overflow-hidden bg-dark-950 text-dark-100">
      <Sidebar mobile />
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <main className="flex-1 lg:ml-64 overflow-hidden flex flex-col">
        {/* Header bar */}
        <div className="shrink-0 flex items-center justify-end px-6 py-2.5 border-b border-dark-800/60">
          <Header />
        </div>
        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div className="max-w-7xl mx-auto h-full">
              {children}
            </div>
          </div>
        </div>
      </main>
      <NotificationContainer />
    </div>
  );
}

function App() {
  useEffect(() => { document.title = 'Hermes Admin'; }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/skills" element={<SkillManager />} />
              <Route path="/tools" element={<ToolExplorer />} />
              <Route path="/memory" element={<MemoryManager />} />
              <Route path="/cronjobs" element={<CronJobManager />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
