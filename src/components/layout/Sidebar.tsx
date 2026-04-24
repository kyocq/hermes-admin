import { cn } from '../../utils';
import { navItems } from '../../config/nav';
import { Link, useLocation } from 'react-router-dom';
import { Home, Menu } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  mobile?: boolean;
}

export function Sidebar({ mobile }: SidebarProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-dark-700/50">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
          <Home className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-dark-100">Hermes</h1>
          <p className="text-xs text-dark-500">Admin</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href ||
            (location.pathname === '/' && item.href === '/');

          return (
            <Link
              key={item.id}
              to={item.href}
              onClick={() => mobile && setIsOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                'text-dark-400 hover:text-dark-100 hover:bg-dark-800',
                isActive && 'bg-primary-500/10 text-primary-400'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'text-primary-400')} />
              <span className="font-medium">{t(item.label)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-dark-700/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-dark-800/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">H</span>
          </div>
          <div>
            <p className="text-sm font-medium text-dark-200">Hermes Admin</p>
            <p className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Online
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-4 left-4 z-50 p-2 bg-dark-800 rounded-lg text-dark-200"
        >
          <Menu className="w-6 h-6" />
        </button>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="fixed left-0 top-0 bottom-0 w-64 z-50 glass">
              <SidebarContent />
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 glass z-40">
      <SidebarContent />
    </div>
  );
}
