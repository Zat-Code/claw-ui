import { useEffect, useState } from 'react';
import { useGatewayStore } from '@/lib/store';
import { Card, CardHeader, CardContent, Badge, Button, Input, Textarea, Checkbox } from '@/components';
import { Users, RefreshCw, Bot, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import type { GatewayAgentRow } from '@/types';

type AgentFormData = {
  name: string;
  workspace: string;
  model: string;
  emoji: string;
  avatar: string;
};

export function AgentsPage() {
  const { agents, loadAgents, client } = useGatewayStore();
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<GatewayAgentRow | null>(null);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    workspace: '',
    model: '',
    emoji: '',
    avatar: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', workspace: '', model: '', emoji: '', avatar: '' });
    setEditingAgent(null);
    setShowForm(false);
  };

  const handleCreate = () => {
    setEditingAgent(null);
    setFormData({ name: '', workspace: '', model: '', emoji: '', avatar: '' });
    setShowForm(true);
  };

  const handleEdit = (agent: GatewayAgentRow) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name || agent.identity?.name || '',
      workspace: '',
      model: '',
      emoji: agent.identity?.emoji || '',
      avatar: agent.identity?.avatar || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    setLoading(true);
    try {
      if (editingAgent) {
        await client?.request('agents.update', {
          agentId: editingAgent.id,
          name: formData.name,
          workspace: formData.workspace || undefined,
          model: formData.model || undefined,
          emoji: formData.emoji || undefined,
          avatar: formData.avatar || undefined,
        });
      } else {
        await client?.request('agents.create', {
          name: formData.name,
          workspace: formData.workspace || undefined,
          emoji: formData.emoji || undefined,
          avatar: formData.avatar || undefined,
        });
      }
      await loadAgents();
      resetForm();
    } catch (err) {
      console.error('Failed to save agent:', err);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agents</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage OpenClaw agents</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadAgents}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreate}>
            <Plus size={16} className="mr-2" />
            Add Agent
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <Users size={24} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Agents</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {agents?.agents.length ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Bot size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Default Agent</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {agents?.defaultId ?? 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Bot size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Main Key</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {agents?.mainKey ?? 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader
            title={editingAgent ? `Edit Agent: ${editingAgent.id}` : 'New Agent'}
            subtitle={editingAgent ? 'Update agent settings' : 'Create a new agent'}
          />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Agent name"
              />
              {!editingAgent && (
                <Input
                  label="Workspace (optional)"
                  value={formData.workspace}
                  onChange={(e) => setFormData({ ...formData, workspace: e.target.value })}
                  placeholder="~/.openclaw/workspace/my-agent"
                />
              )}
            </div>
            {editingAgent && (
              <Input
                label="Model (optional)"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="opencode/minimax-m2.5-free"
              />
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Emoji (optional)"
                value={formData.emoji}
                onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                placeholder="🤖"
              />
              <Input
                label="Avatar URL (optional)"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} loading={loading}>
                <Check size={16} className="mr-2" />
                {editingAgent ? 'Update Agent' : 'Create Agent'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agents List */}
      <Card>
        <CardHeader title="Agents" subtitle={`${agents?.agents.length ?? 0} agents configured`} />
        <CardContent>
          {!agents?.agents.length ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
              No agents found
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {agents.agents.map((agent) => (
                <div key={agent.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-2xl">
                      {agent.identity?.emoji || agent.identity?.avatar || '🤖'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {agent.name || agent.identity?.name || agent.id}
                        </h4>
                        {agent.id === agents?.defaultId && (
                          <Badge variant="info" size="sm">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">ID: {agent.id}</p>
                      {agent.identity?.theme && (
                        <p className="text-xs text-gray-400 mt-1">Theme: {agent.identity.theme}</p>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => handleEdit(agent)}>
                    <Edit2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
