import { useState } from 'react';
import { useGatewayStore } from '@/lib/store';
import { Card, CardHeader, CardContent, Button, Input, Select } from '@/components';
import { Save, Power, PowerOff } from 'lucide-react';

export function SettingsPage() {
  const { settings, setSettings, connect, disconnect, connectionState } = useGatewayStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSettings(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleConnect = () => {
    setSettings(localSettings);
    setTimeout(() => connect(), 100);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Configure connection to OpenClaw Gateway
        </p>
      </div>

      <Card>
        <CardHeader title="Gateway Connection" subtitle="WebSocket connection settings" />
        <CardContent className="space-y-4">
          <Input
            label="Gateway URL"
            value={localSettings.gatewayUrl}
            onChange={(e) => setLocalSettings({ ...localSettings, gatewayUrl: e.target.value })}
            placeholder="ws://localhost:18789"
          />
          <Input
            label="Auth Token"
            type="password"
            value={localSettings.token}
            onChange={(e) => setLocalSettings({ ...localSettings, token: e.target.value })}
            placeholder="Gateway authentication token"
          />
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} variant="secondary">
              <Save size={16} className="mr-2" />
              {saved ? 'Saved!' : 'Save Settings'}
            </Button>
            {connectionState === 'connected' ? (
              <Button onClick={disconnect} variant="danger">
                <PowerOff size={16} className="mr-2" />
                Disconnect
              </Button>
            ) : (
              <Button onClick={handleConnect}>
                <Power size={16} className="mr-2" />
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Appearance" subtitle="Customize the UI" />
        <CardContent className="space-y-4">
          <Select
            label="Theme"
            value={localSettings.theme}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                theme: e.target.value as 'light' | 'dark' | 'system',
              })
            }
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
          <Button onClick={handleSave} variant="secondary">
            Save Theme
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Help" subtitle="How to get your token" />
        <CardContent>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>To get your gateway token, run one of these commands:</p>
            <code className="block bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-xs font-mono">
              openclaw dashboard --no-open
            </code>
            <p className="text-xs">
              Or generate a token manually:
            </p>
            <code className="block bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-xs font-mono">
              openclaw doctor --generate-gateway-token
            </code>
            <p className="text-xs mt-2">
              You can also find the token in your <code className="bg-gray-100 dark:bg-gray-900 px-1 rounded">~/.openclaw/openclaw.json</code> file under <code className="bg-gray-100 dark:bg-gray-900 px-1 rounded">gateway.auth.token</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
