import { useEffect, useState } from 'react';
import { useGatewayStore } from '@/lib/store';
import { Card, CardHeader, CardContent, Button, Badge } from '@/components';
import { RefreshCw, Save, AlertCircle, Check } from 'lucide-react';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

const openclawConfigSchema = {
  type: 'object',
  properties: {
    meta: {
      type: 'object',
      properties: {
        lastTouchedVersion: { type: 'string' },
        lastTouchedAt: { type: 'string' },
      },
    },
    auth: {
      type: 'object',
      properties: {
        profiles: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              provider: { type: 'string' },
              mode: { type: 'string' },
            },
          },
        },
      },
    },
    agents: {
      type: 'object',
      properties: {
        defaults: {
          type: 'object',
          properties: {
            model: {
              type: 'object',
              properties: {
                primary: { type: 'string' },
              },
            },
            workspace: { type: 'string' },
            maxConcurrent: { type: 'number' },
          },
        },
      },
    },
    channels: {
      type: 'object',
      properties: {
        telegram: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            botToken: { type: 'string' },
            dmPolicy: { type: 'string' },
            groupPolicy: { type: 'string' },
          },
        },
        discord: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            token: { type: 'string' },
            groupPolicy: { type: 'string' },
          },
        },
      },
    },
    gateway: {
      type: 'object',
      properties: {
        port: { type: 'number' },
        mode: { type: 'string' },
        bind: { type: 'string' },
        auth: {
          type: 'object',
          properties: {
            token: { type: 'string' },
          },
        },
      },
    },
    plugins: {
      type: 'object',
      properties: {
        entries: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
            },
          },
        },
      },
    },
  },
};

export function ConfigPage() {
  const { config, configLoading, loadConfig, applyConfig } = useGatewayStore();
  const [jsonText, setJsonText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config?.raw) {
      setJsonText(config.raw);
    }
  }, [config]);

  const validateJson = (text: string): { valid: boolean; parsed?: object; errors: string[] } => {
    try {
      const parsed = JSON.parse(text);
      setParseError(null);
      
      const valid = ajv.validate(openclawConfigSchema, parsed);
      if (!valid && ajv.errors) {
        const errors = ajv.errors.map((e) => `${e.instancePath} ${e.message}`);
        setValidationErrors(errors);
        return { valid: false, parsed, errors };
      }
      
      setValidationErrors([]);
      return { valid: true, parsed, errors: [] };
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Invalid JSON';
      setParseError(error);
      return { valid: false, errors: [error] };
    }
  };

  const handleSave = async () => {
    const { valid, parsed } = validateJson(jsonText);
    if (!valid || !parsed) return;
    
    setSaving(true);
    try {
      await applyConfig(parsed as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save config:', err);
    }
    setSaving(false);
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setParseError(null);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuration</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Edit openclaw.json configuration</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadConfig} loading={configLoading}>
            <RefreshCw size={16} className="mr-2" />
            Reload
          </Button>
          <Button variant="secondary" onClick={formatJson}>
            Format
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!!parseError || validationErrors.length > 0}>
            {saved ? <Check size={16} className="mr-2" /> : <Save size={16} className="mr-2" />}
            {saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Validation Errors */}
      {(parseError || validationErrors.length > 0) && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200">Validation Error</h4>
                {parseError && <p className="text-sm text-red-600 dark:text-red-300 mt-1">{parseError}</p>}
                {validationErrors.length > 0 && (
                  <ul className="text-sm text-red-600 dark:text-red-300 mt-1 list-disc list-inside">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Config Info */}
      {config && (
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>Path: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{config.path || 'N/A'}</code></span>
          <Badge variant={config.valid ? 'success' : 'warning'}>
            {config.valid ? 'Valid' : 'Invalid'}
          </Badge>
          {config.hash && <span>Hash: {config.hash.slice(0, 8)}...</span>}
        </div>
      )}

      {/* JSON Editor */}
      <Card>
        <CardHeader title="JSON Editor" subtitle="Edit the configuration directly" />
        <CardContent>
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              validateJson(e.target.value);
            }}
            className="w-full h-[600px] font-mono text-sm p-4 bg-gray-900 text-gray-100 rounded-lg border-0 focus:ring-2 focus:ring-primary-500 resize-none"
            spellCheck={false}
          />
        </CardContent>
      </Card>

      {/* Config Issues */}
      {config?.issues && config.issues.length > 0 && (
        <Card>
          <CardHeader title="Config Issues" subtitle="Problems detected in current config" />
          <CardContent>
            <ul className="space-y-2">
              {config.issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertCircle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <code className="text-gray-600 dark:text-gray-400">{issue.path}</code>
                    <p className="text-gray-900 dark:text-white">{issue.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
