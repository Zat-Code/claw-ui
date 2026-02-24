import { useEffect } from 'react';
import { useGatewayStore } from '@/lib/store';
import { Card, CardHeader, CardContent, Badge, Button } from '@/components';
import { formatRelativeTimestamp, formatDurationMs } from '@/lib/format';
import { Activity, Clock, Users, Radio, RefreshCw, AlertCircle } from 'lucide-react';

export function DashboardPage() {
  const {
    connectionState,
    hello,
    error,
    cronStatus,
    cronJobs,
    agents,
    channels,
    loadCronStatus,
    loadCronJobs,
    loadAgents,
    loadChannels,
    connect,
  } = useGatewayStore();

  useEffect(() => {
    if (connectionState === 'connected') {
      loadCronStatus();
      loadCronJobs();
      loadAgents();
      loadChannels();
    }
  }, [connectionState]);

  if (connectionState !== 'connected') {
    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle size={48} className="mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Not Connected
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {error || 'Please configure and connect to the gateway first.'}
            </p>
            <Button onClick={connect}>Connect to Gateway</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const uptime = hello?.snapshot?.uptimeMs
    ? formatDurationMs(hello.snapshot.uptimeMs)
    : 'N/A';

  const enabledJobs = cronJobs.filter((j) => j.enabled).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">OpenClaw Gateway Overview</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            loadCronStatus();
            loadCronJobs();
            loadAgents();
            loadChannels();
          }}
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Activity size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <Badge variant="success">Connected</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Clock size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Uptime</p>
              <p className="font-semibold text-gray-900 dark:text-white">{uptime}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Clock size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cron Jobs</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {enabledJobs}/{cronJobs.length} active
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Users size={24} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Agents</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {agents?.agents.length ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cron Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Cron Scheduler" subtitle="Scheduled jobs status" />
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Enabled</span>
                <Badge variant={cronStatus?.enabled ? 'success' : 'warning'}>
                  {cronStatus?.enabled ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Jobs</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {cronStatus?.jobs ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Next Wake</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {cronStatus?.nextWakeAtMs
                    ? formatRelativeTimestamp(cronStatus.nextWakeAtMs)
                    : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Channels" subtitle="Active channels status" />
          <CardContent>
            <div className="space-y-3">
              {channels?.channelOrder.map((channelId) => {
                const accounts = channels.channelAccounts[channelId] || [];
                const label = channels.channelLabels[channelId] || channelId;
                const connected = accounts.some((a) => a.connected);
                return (
                  <div key={channelId} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Radio size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                    </div>
                    <Badge variant={connected ? 'success' : 'default'}>
                      {connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                );
              })}
              {!channels?.channelOrder.length && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No channels configured</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Cron Jobs */}
      <Card>
        <CardHeader title="Recent Cron Jobs" subtitle="Last scheduled jobs" />
        <CardContent>
          <div className="space-y-3">
            {cronJobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{job.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {job.state?.lastStatus ?? 'N/A'} •{' '}
                    {job.state?.lastRunAtMs
                      ? formatRelativeTimestamp(job.state.lastRunAtMs)
                      : 'Never run'}
                  </p>
                </div>
                <Badge variant={job.enabled ? 'success' : 'default'}>
                  {job.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            ))}
            {cronJobs.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No cron jobs configured</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
