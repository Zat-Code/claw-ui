import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  Clock,
  Cog,
  Users,
  Radio,
  MessageSquare,
  MessageCircle,
  Server,
  Menu,
  X,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { useGatewayStore } from '@/lib/store';
import clsx from 'clsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/config', icon: Cog, label: 'Configuration' },
  { to: '/cron', icon: Clock, label: 'Cron Jobs' },
  { to: '/agents', icon: Users, label: 'Agents' },
  { to: '/channels', icon: Radio, label: 'Channels' },
  { to: '/sessions', icon: MessageSquare, label: 'Sessions' },
  { to: '/skills', icon: Wrench, label: 'Skills' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { connectionState, hello } = useGatewayStore();

  const connectionColor =
    connectionState === 'connected'
      ? 'bg-green-500'
      : connectionState === 'connecting'
        ? 'bg-yellow-500'
        : connectionState === 'error'
          ? 'bg-red-500'
          : 'bg-gray-500';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <span className="font-semibold text-gray-900 dark:text-white">Claw UI</span>
        <div className={`w-3 h-3 rounded-full ${connectionColor}`} />
      </div>

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-40 h-screen pt-0 lg:pt-0 transition-transform bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-full px-3 py-4 overflow-y-auto">
          <div className="flex items-center gap-3 px-3 mb-6 mt-12 lg:mt-0">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Server size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white">Claw UI</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">OpenClaw Manager</p>
            </div>
          </div>

          {/* Connection status */}
          <div className="mb-6 px-3">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${connectionColor}`} />
              <span className="text-gray-600 dark:text-gray-300 capitalize">{connectionState}</span>
            </div>
            {hello?.snapshot?.uptimeMs && (
              <p className="text-xs text-gray-400 mt-1">
                Uptime: {Math.round(hello.snapshot.uptimeMs / 60000)}min
              </p>
            )}
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )
                }
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="p-4 lg:p-6">{children}</div>
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
