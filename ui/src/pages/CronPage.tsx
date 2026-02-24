import { useEffect, useState } from 'react';
import { useGatewayStore } from '@/lib/store';
import { Card, CardHeader, CardContent, Button, Input, Textarea, Select, Checkbox, Badge } from '@/components';
import { formatRelativeTimestamp, formatDurationMs, formatCronSchedule } from '@/lib/format';
import type { CronJob, CronSchedule, CronPayload, CronDelivery, CronRunLogEntry } from '@/types';
import { Plus, Trash2, Play, RefreshCw, X, Check, Clock, Edit2, History } from 'lucide-react';

type CronFormData = {
  name: string;
  description: string;
  agentId: string;
  enabled: boolean;
  scheduleKind: 'cron' | 'every' | 'at';
  cronExpr: string;
  cronTz: string;
  everyAmount: string;
  everyUnit: 'minutes' | 'hours' | 'days';
  scheduleAt: string;
  sessionTarget: 'main' | 'isolated';
  wakeMode: 'now' | 'next-heartbeat';
  payloadKind: 'agentTurn' | 'systemEvent';
  payloadText: string;
  timeoutSeconds: string;
  deliveryMode: 'none' | 'announce' | 'webhook';
  deliveryChannel: string;
  deliveryTo: string;
};

const defaultFormData: CronFormData = {
  name: '',
  description: '',
  agentId: 'main',
  enabled: true,
  scheduleKind: 'cron',
  cronExpr: '0 10 * * *',
  cronTz: '',
  everyAmount: '30',
  everyUnit: 'minutes',
  scheduleAt: '',
  sessionTarget: 'isolated',
  wakeMode: 'now',
  payloadKind: 'agentTurn',
  payloadText: '',
  timeoutSeconds: '120',
  deliveryMode: 'none',
  deliveryChannel: '',
  deliveryTo: '',
};

function jobToFormData(job: CronJob): CronFormData {
  const schedule = job.schedule;
  let scheduleKind: CronFormData['scheduleKind'] = 'cron';
  let cronExpr = '';
  let cronTz = '';
  let everyAmount = '30';
  let everyUnit: CronFormData['everyUnit'] = 'minutes';
  let scheduleAt = '';

  if (schedule.kind === 'cron') {
    scheduleKind = 'cron';
    cronExpr = schedule.expr;
    cronTz = schedule.tz || '';
  } else if (schedule.kind === 'every') {
    scheduleKind = 'every';
    const ms = schedule.everyMs;
    if (ms >= 86400000) {
      everyAmount = String(ms / 86400000);
      everyUnit = 'days';
    } else if (ms >= 3600000) {
      everyAmount = String(ms / 3600000);
      everyUnit = 'hours';
    } else {
      everyAmount = String(ms / 60000);
      everyUnit = 'minutes';
    }
  } else if (schedule.kind === 'at') {
    scheduleKind = 'at';
    scheduleAt = schedule.at;
  }

  return {
    name: job.name,
    description: job.description || '',
    agentId: job.agentId || 'main',
    enabled: job.enabled,
    scheduleKind,
    cronExpr,
    cronTz,
    everyAmount,
    everyUnit,
    scheduleAt,
    sessionTarget: job.sessionTarget,
    wakeMode: job.wakeMode,
    payloadKind: job.payload.kind,
    payloadText: job.payload.kind === 'agentTurn' ? job.payload.message : job.payload.text,
    timeoutSeconds: job.payload.kind === 'agentTurn' ? String(job.payload.timeoutSeconds || 120) : '120',
    deliveryMode: job.delivery?.mode || 'none',
    deliveryChannel: job.delivery?.channel || '',
    deliveryTo: job.delivery?.to || '',
  };
}

function buildSchedule(form: CronFormData): CronSchedule {
  if (form.scheduleKind === 'cron') {
    return { kind: 'cron', expr: form.cronExpr, tz: form.cronTz || undefined };
  }
  if (form.scheduleKind === 'every') {
    const units: Record<string, number> = { minutes: 60000, hours: 3600000, days: 86400000 };
    return { kind: 'every', everyMs: parseInt(form.everyAmount) * units[form.everyUnit] };
  }
  return { kind: 'at', at: form.scheduleAt };
}

function buildPayload(form: CronFormData): CronPayload {
  if (form.payloadKind === 'systemEvent') {
    return { kind: 'systemEvent', text: form.payloadText };
  }
  return {
    kind: 'agentTurn',
    message: form.payloadText,
    timeoutSeconds: parseInt(form.timeoutSeconds) || 120,
  };
}

function buildDelivery(form: CronFormData): CronDelivery | undefined {
  if (form.deliveryMode === 'none') return undefined;
  return {
    mode: form.deliveryMode,
    channel: form.deliveryChannel || undefined,
    to: form.deliveryTo || undefined,
  };
}

function CronJobForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  loading,
  isEdit,
}: {
  formData: CronFormData;
  setFormData: React.Dispatch<React.SetStateAction<CronFormData>>;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
  isEdit: boolean;
}) {
  return (
    <Card>
      <CardHeader title={isEdit ? 'Edit Cron Job' : 'New Cron Job'} subtitle={isEdit ? 'Update the scheduled task' : 'Create a scheduled task'} />
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Job name"
          />
          <Input
            label="Agent ID"
            value={formData.agentId}
            onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
            placeholder="main"
          />
        </div>
        <Input
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Schedule Type"
            value={formData.scheduleKind}
            onChange={(e) => setFormData({ ...formData, scheduleKind: e.target.value as CronFormData['scheduleKind'] })}
            options={[
              { value: 'cron', label: 'Cron Expression' },
              { value: 'every', label: 'Every X' },
              { value: 'at', label: 'At Date/Time' },
            ]}
          />
          {formData.scheduleKind === 'cron' && (
            <>
              <Input
                label="Cron Expression"
                value={formData.cronExpr}
                onChange={(e) => setFormData({ ...formData, cronExpr: e.target.value })}
                placeholder="0 10 * * *"
              />
              <Input
                label="Timezone (optional)"
                value={formData.cronTz}
                onChange={(e) => setFormData({ ...formData, cronTz: e.target.value })}
                placeholder="Europe/Paris"
              />
            </>
          )}
          {formData.scheduleKind === 'every' && (
            <>
              <Input
                label="Amount"
                type="number"
                value={formData.everyAmount}
                onChange={(e) => setFormData({ ...formData, everyAmount: e.target.value })}
              />
              <Select
                label="Unit"
                value={formData.everyUnit}
                onChange={(e) => setFormData({ ...formData, everyUnit: e.target.value as CronFormData['everyUnit'] })}
                options={[
                  { value: 'minutes', label: 'Minutes' },
                  { value: 'hours', label: 'Hours' },
                  { value: 'days', label: 'Days' },
                ]}
              />
            </>
          )}
          {formData.scheduleKind === 'at' && (
            <Input
              label="Run At"
              type="datetime-local"
              value={formData.scheduleAt}
              onChange={(e) => setFormData({ ...formData, scheduleAt: e.target.value })}
            />
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Session Target"
            value={formData.sessionTarget}
            onChange={(e) => setFormData({ ...formData, sessionTarget: e.target.value as CronFormData['sessionTarget'] })}
            options={[
              { value: 'main', label: 'Main' },
              { value: 'isolated', label: 'Isolated' },
            ]}
          />
          <Select
            label="Wake Mode"
            value={formData.wakeMode}
            onChange={(e) => setFormData({ ...formData, wakeMode: e.target.value as CronFormData['wakeMode'] })}
            options={[
              { value: 'now', label: 'Now' },
              { value: 'next-heartbeat', label: 'Next Heartbeat' },
            ]}
          />
          <Select
            label="Payload Type"
            value={formData.payloadKind}
            onChange={(e) => setFormData({ ...formData, payloadKind: e.target.value as CronFormData['payloadKind'] })}
            options={[
              { value: 'agentTurn', label: 'Agent Turn' },
              { value: 'systemEvent', label: 'System Event' },
            ]}
          />
        </div>
        <Textarea
          label={formData.payloadKind === 'agentTurn' ? 'Agent Message' : 'System Text'}
          value={formData.payloadText}
          onChange={(e) => setFormData({ ...formData, payloadText: e.target.value })}
          placeholder="Enter the message or prompt..."
          rows={4}
        />
        {formData.payloadKind === 'agentTurn' && (
          <Input
            label="Timeout (seconds)"
            type="number"
            value={formData.timeoutSeconds}
            onChange={(e) => setFormData({ ...formData, timeoutSeconds: e.target.value })}
          />
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Delivery Mode"
            value={formData.deliveryMode}
            onChange={(e) => setFormData({ ...formData, deliveryMode: e.target.value as CronFormData['deliveryMode'] })}
            options={[
              { value: 'none', label: 'None (internal)' },
              { value: 'announce', label: 'Announce' },
              { value: 'webhook', label: 'Webhook' },
            ]}
          />
          {formData.deliveryMode !== 'none' && (
            <>
              <Input
                label={formData.deliveryMode === 'webhook' ? 'Webhook URL' : 'Channel'}
                value={formData.deliveryChannel}
                onChange={(e) => setFormData({ ...formData, deliveryChannel: e.target.value })}
                placeholder={formData.deliveryMode === 'webhook' ? 'https://...' : 'telegram'}
              />
              <Input
                label="To"
                value={formData.deliveryTo}
                onChange={(e) => setFormData({ ...formData, deliveryTo: e.target.value })}
                placeholder="-123456789"
              />
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Checkbox
            label="Enabled"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={loading}>
            <Check size={16} className="mr-2" />
            {isEdit ? 'Update Job' : 'Create Job'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RunHistory({ runs, jobId }: { runs: CronRunLogEntry[]; jobId: string }) {
  if (runs.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No run history for this job</p>;
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {runs.map((run, i) => (
        <div key={`${run.ts}-${i}`} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    run.status === 'ok' ? 'success' : run.status === 'error' ? 'danger' : 'warning'
                  }
                  size="sm"
                >
                  {run.status}
                </Badge>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatRelativeTimestamp(run.ts)}
                </span>
              </div>
              {run.summary && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{run.summary}</p>
              )}
              {run.error && (
                <p className="text-sm text-red-500 mt-1">{run.error}</p>
              )}
            </div>
            <div className="text-right text-xs text-gray-400">
              {run.durationMs && <span>{formatDurationMs(run.durationMs)}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CronPage() {
  const {
    cronJobs,
    cronStatus,
    cronRuns,
    cronRunsJobId,
    loadCronJobs,
    loadCronStatus,
    loadCronRuns,
    addCronJob,
    updateCronJob,
    toggleCronJob,
    removeCronJob,
    runCronJob,
  } = useGatewayStore();
  
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [formData, setFormData] = useState<CronFormData>(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  useEffect(() => {
    loadCronJobs();
    loadCronStatus();
  }, []);

  useEffect(() => {
    if (expandedJobId) {
      loadCronRuns(expandedJobId);
    }
  }, [expandedJobId]);

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingJob(null);
    setShowForm(false);
  };

  const handleCreate = () => {
    setEditingJob(null);
    setFormData(defaultFormData);
    setShowForm(true);
  };

  const handleEdit = (job: CronJob) => {
    setEditingJob(job);
    setFormData(jobToFormData(job));
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.payloadText.trim()) return;
    setLoading(true);
    try {
      const jobData = {
        name: formData.name,
        description: formData.description || undefined,
        agentId: formData.agentId || 'main',
        enabled: formData.enabled,
        schedule: buildSchedule(formData),
        sessionTarget: formData.sessionTarget,
        wakeMode: formData.wakeMode,
        payload: buildPayload(formData),
        delivery: buildDelivery(formData),
      };

      if (editingJob) {
        await updateCronJob(editingJob.id, jobData);
      } else {
        await addCronJob(jobData);
      }
      resetForm();
    } catch (err) {
      console.error('Failed to save job:', err);
    }
    setLoading(false);
  };

  const handleToggleHistory = (jobId: string) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
    } else {
      setExpandedJobId(jobId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cron Jobs</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage scheduled tasks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { loadCronJobs(); loadCronStatus(); }}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreate}>
            <Plus size={16} className="mr-2" />
            Add Job
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardContent className="flex items-center gap-6 py-4">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Scheduler:</span>
            <Badge variant={cronStatus?.enabled ? 'success' : 'warning'}>
              {cronStatus?.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-white">{cronJobs.length}</span> jobs
          </div>
          {cronStatus?.nextWakeAtMs && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Next wake: <span className="font-medium text-gray-900 dark:text-white">{formatRelativeTimestamp(cronStatus.nextWakeAtMs)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form */}
      {showForm && (
        <CronJobForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={resetForm}
          loading={loading}
          isEdit={!!editingJob}
        />
      )}

      {/* Jobs List */}
      <Card>
        <CardHeader title="Jobs" subtitle={`${cronJobs.length} scheduled jobs`} />
        <CardContent>
          {cronJobs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No cron jobs configured</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {cronJobs.map((job) => (
                <div key={job.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{job.name}</h4>
                        <Badge variant={job.enabled ? 'success' : 'default'} size="sm">
                          {job.enabled ? 'enabled' : 'disabled'}
                        </Badge>
                        <Badge variant="info" size="sm">{job.sessionTarget}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {formatCronSchedule(job.schedule)}
                      </p>
                      {job.payload.kind === 'agentTurn' && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                          {job.payload.message}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>
                          Status: <span className={
                            job.state?.lastStatus === 'ok' ? 'text-green-500' :
                            job.state?.lastStatus === 'error' ? 'text-red-500' :
                            'text-gray-400'
                          }>{job.state?.lastStatus ?? 'N/A'}</span>
                        </span>
                        <span>Last: {job.state?.lastRunAtMs ? formatRelativeTimestamp(job.state.lastRunAtMs) : 'Never'}</span>
                        <span>Next: {job.state?.nextRunAtMs ? formatRelativeTimestamp(job.state.nextRunAtMs) : 'N/A'}</span>
                        {job.state?.lastDurationMs && <span>Duration: {formatDurationMs(job.state.lastDurationMs)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button size="sm" variant="secondary" onClick={() => handleEdit(job)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleCronJob(job.id, !job.enabled)}
                      >
                        {job.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => runCronJob(job.id)}>
                        <Play size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant={expandedJobId === job.id ? 'primary' : 'secondary'}
                        onClick={() => handleToggleHistory(job.id)}
                      >
                        <History size={14} />
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => removeCronJob(job.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Run History */}
                  {expandedJobId === job.id && (
                    <div className="mt-4 pl-4 border-l-2 border-primary-200 dark:border-primary-800">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Run History
                      </h5>
                      {cronRunsJobId === job.id ? (
                        <RunHistory runs={cronRuns} jobId={job.id} />
                      ) : (
                        <p className="text-sm text-gray-500">Loading...</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
