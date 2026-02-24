import { useEffect, useState } from 'react';
import { useGatewayStore } from '@/lib/store';
import { Card, CardHeader, CardContent, Badge, Button, Input, Textarea, Select } from '@/components';
import { Wrench, RefreshCw, AlertCircle, ExternalLink, Download, Settings, Play, Pause, X, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import type { SkillStatusEntry, SkillInstallOption } from '@/types';

function ConfigModal({
  skill,
  onUpdate,
  onClose,
}: {
  skill: SkillStatusEntry;
  onUpdate: (patch: { enabled?: boolean; apiKey?: string }) => void;
  onClose: () => void;
}) {
  const [enabled, setEnabled] = useState(!skill.disabled);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onUpdate({
        enabled,
        apiKey: apiKey || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Update failed:', err);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader 
          title={skill.name}
          subtitle={skill.description}
          action={
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          }
        />
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Statut du skill</p>
              <p className="text-sm text-gray-500">
                {skill.eligible ? 'Prêt à utiliser' : 'Dépendances manquantes'}
              </p>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className="text-3xl"
            >
              {enabled ? (
                <span className="text-green-500"><ToggleRight /></span>
              ) : (
                <span className="text-gray-400"><ToggleLeft /></span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Source</p>
              <p className="font-medium text-gray-900 dark:text-white">{skill.source}</p>
            </div>
            <div>
              <p className="text-gray-500">Clé</p>
              <p className="font-mono text-xs text-gray-900 dark:text-white break-all">{skill.skillKey}</p>
            </div>
          </div>

          {skill.primaryEnv && (
            <Input
              label={`Clé API (${skill.primaryEnv})`}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Entrez votre clé API..."
            />
          )}

          {skill.missing.bins.length > 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Binaires manquants</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                {skill.missing.bins.join(', ')}
              </p>
            </div>
          )}

          {skill.missing.env.length > 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Variables d'environnement manquantes</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                {skill.missing.env.join(', ')}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave} loading={loading}>
              <Check size={16} className="mr-2" />
              Sauvegarder
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SkillsPage() {
  const { skills, loadSkills, updateSkill } = useGatewayStore();
  const [tab, setTab] = useState<'ready' | 'all'>('ready');
  const [configModal, setConfigModal] = useState<SkillStatusEntry | null>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  const readySkills = skills?.skills.filter((s) => s.eligible && !s.disabled) || [];
  const allSkills = skills?.skills || [];

  const handleUpdate = async (skillKey: string, patch: { enabled?: boolean; apiKey?: string }) => {
    await updateSkill(skillKey, patch);
  };

  const renderSkill = (skill: SkillStatusEntry) => (
    <div key={skill.skillKey} className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {skill.emoji && <span className="text-xl">{skill.emoji}</span>}
            <h4 className="font-medium text-gray-900 dark:text-white">{skill.name}</h4>
            {skill.bundled && <Badge variant="info" size="sm">Inclus</Badge>}
            {skill.always && <Badge variant="info" size="sm">Toujours actif</Badge>}
            {skill.disabled ? (
              <Badge variant="default" size="sm">Désactivé</Badge>
            ) : skill.eligible ? (
              <Badge variant="success" size="sm">Actif</Badge>
            ) : (
              <Badge variant="warning" size="sm">Inactif</Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{skill.description}</p>
          {skill.primaryEnv && (
            <p className="text-xs text-gray-400 mt-1">API key: {skill.primaryEnv}</p>
          )}
        </div>
        <Button size="sm" variant="secondary" onClick={() => setConfigModal(skill)}>
          <Settings size={14} />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Skills</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gérez vos skills</p>
        </div>
        <Button variant="secondary" onClick={loadSkills}>
          <RefreshCw size={16} className="mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Play size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{readySkills.length}</p>
              <p className="text-xs text-gray-500">Actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <Settings size={20} className="text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{allSkills.length}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Download size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {allSkills.filter((s) => s.source === 'remote').length}
              </p>
              <p className="text-xs text-gray-500">Disponibles</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {allSkills.filter((s) => !s.eligible).length}
              </p>
              <p className="text-xs text-gray-500">Bloqués</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab('ready')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            tab === 'ready'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Skills actifs ({readySkills.length})
        </button>
        <button
          onClick={() => setTab('all')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            tab === 'all'
              ? 'border-gray-500 text-gray-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Tous les skills ({allSkills.length})
        </button>
      </div>

      {/* Skills List */}
      <Card>
        <CardContent>
          {tab === 'ready' && readySkills.length === 0 && (
            <p className="text-sm text-gray-500 py-8 text-center">Aucun skill actif</p>
          )}
          {tab === 'all' && allSkills.length === 0 && (
            <p className="text-sm text-gray-500 py-8 text-center">Aucun skill disponible</p>
          )}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {tab === 'ready' && readySkills.map(renderSkill)}
            {tab === 'all' && allSkills.map(renderSkill)}
          </div>
        </CardContent>
      </Card>

      {/* Config Modal */}
      {configModal && (
        <ConfigModal
          skill={configModal}
          onUpdate={(patch) => handleUpdate(configModal.skillKey, patch)}
          onClose={() => setConfigModal(null)}
        />
      )}
    </div>
  );
}
