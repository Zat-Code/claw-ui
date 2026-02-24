import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components';
import {
  DashboardPage,
  SettingsPage,
  ConfigPage,
  CronPage,
  AgentsPage,
  ChannelsPage,
  SessionsPage,
  SkillsPage,
  ChatPage,
} from '@/pages';
import { useGatewayStore } from '@/lib/store';
import { useTheme } from '@/hooks/useTheme';
import { useEffect } from 'react';

function AppContent() {
  const { settings, connect, connectionState } = useGatewayStore();
  
  useTheme();

  useEffect(() => {
    if (settings.token && connectionState === 'disconnected') {
      connect();
    }
  }, []);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/cron" element={<CronPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/channels" element={<ChannelsPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
