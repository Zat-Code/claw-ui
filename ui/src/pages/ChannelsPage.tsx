import { useEffect } from 'react';
import { useGatewayStore } from '@/lib/store';
import { Card, CardContent, Badge, Button } from '@/components';
import { Radio, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { formatRelativeTimestamp } from '@/lib/format';

export function ChannelsPage() {
  const { channels, loadChannels } = useGatewayStore();

  useEffect(() => {
    loadChannels();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Channels</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Channel connection status</p>
        </div>
        <Button variant="secondary" onClick={loadChannels}>
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels?.channelOrder.map((channelId) => {
          const accounts = channels.channelAccounts[channelId] || [];
          const label = channels.channelLabels[channelId] || channelId;
          const hasConnected = accounts.some((a) => a.connected);
          const hasError = accounts.some((a) => a.lastError);

          return (
            <Card key={channelId}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        hasConnected
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}
                    >
                      <Radio
                        size={20}
                        className={
                          hasConnected
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-400'
                        }
                      />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                        {label}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {accounts.length} account(s)
                      </p>
                    </div>
                  </div>
                  <Badge variant={hasConnected ? 'success' : hasError ? 'danger' : 'default'}>
                    {hasConnected ? 'Connected' : hasError ? 'Error' : 'Disconnected'}
                  </Badge>
                </div>

                {accounts.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    {accounts.map((account) => (
                      <div key={account.accountId} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700 dark:text-gray-300">
                            {account.name || account.accountId}
                          </span>
                          <span className="flex items-center gap-1">
                            {account.connected ? (
                              <Check size={14} className="text-green-500" />
                            ) : (
                              <X size={14} className="text-gray-400" />
                            )}
                          </span>
                        </div>
                        {account.lastError && (
                          <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                            <AlertCircle size={12} />
                            {account.lastError}
                          </p>
                        )}
                        {account.lastConnectedAt && (
                          <p className="text-xs text-gray-400 mt-1">
                            Last connected: {formatRelativeTimestamp(account.lastConnectedAt)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {(!channels?.channelOrder.length) && (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center">
              <Radio size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No channels configured</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
