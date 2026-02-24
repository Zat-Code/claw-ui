import { useEffect } from 'react';
import { useGatewayStore } from '@/lib/store';
import { Card, CardHeader, CardContent, Badge, Button } from '@/components';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { formatRelativeTimestamp } from '@/lib/format';

export function SessionsPage() {
  const { sessions, loadSessions } = useGatewayStore();

  useEffect(() => {
    loadSessions();
  }, []);

  const kindColors: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
    direct: 'info',
    group: 'success',
    global: 'warning',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sessions</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Active conversation sessions</p>
        </div>
        <Button variant="secondary" onClick={loadSessions}>
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <MessageSquare size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {sessions?.count ?? sessions?.sessions.length ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader title="Sessions" subtitle={`${sessions?.sessions.length ?? 0} sessions`} />
        <CardContent>
          {!sessions?.sessions.length ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
              No sessions found
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {sessions.sessions.map((session) => (
                <div key={session.key} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {session.displayName || session.label || session.key}
                        </h4>
                        <Badge variant={kindColors[session.kind] || 'default'} size="sm">
                          {session.kind}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="truncate max-w-xs">{session.key}</span>
                        {session.model && <span>Model: {session.model}</span>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-400 ml-4">
                      {session.updatedAt ? formatRelativeTimestamp(session.updatedAt) : 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
