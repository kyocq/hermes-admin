import { LayoutDashboard, MessageSquare, Timer, Wrench, Settings, Terminal, Brain } from 'lucide-react';

export const navItems = [
  { id: 'dashboard', label: 'nav.dashboard', icon: LayoutDashboard, href: '/' },
  { id: 'chat', label: 'nav.chat', icon: MessageSquare, href: '/chat' },
  { id: 'skills', label: 'nav.skills', icon: Wrench, href: '/skills' },
  { id: 'tools', label: 'nav.tools', icon: Terminal, href: '/tools' },
  { id: 'memory', label: 'nav.memory', icon: Brain, href: '/memory' },
  { id: 'cronjobs', label: 'nav.cronjobs', icon: Timer, href: '/cronjobs' },
  { id: 'settings', label: 'nav.settings', icon: Settings, href: '/settings' },
];
