import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  UiSettings,
  CronJob,
  CronStatus,
  CronRunLogEntry,
  ConfigSnapshot,
  AgentsListResult,
  ChannelsStatusSnapshot,
  SessionsListResult,
  SkillStatusReport,
  ChatMessage,
  GatewayEventFrame,
  ChatAttachment,
  ToolCall,
} from '@/types';
import { GatewayClient, createGatewayClient } from './gateway';
import type { GatewayHelloOk } from '@/types';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface GatewayState {
  client: GatewayClient | null;
  connectionState: ConnectionState;
  error: string | null;
  hello: GatewayHelloOk | null;
  
  cronJobs: CronJob[];
  cronStatus: CronStatus | null;
  cronRuns: CronRunLogEntry[];
  cronRunsJobId: string | null;
  
  config: ConfigSnapshot | null;
  configLoading: boolean;
  
  agents: AgentsListResult | null;
  channels: ChannelsStatusSnapshot | null;
  sessions: SessionsListResult | null;
  skills: SkillStatusReport | null;
  
  chatMessages: ChatMessage[];
  chatSessionKey: string;
  chatLoading: boolean;
  chatAttachments: ChatAttachment[];
  activeTools: ToolCall[];
  chatThinking: string;
  
  settings: UiSettings;
  
  setSettings: (settings: Partial<UiSettings>) => void;
  connect: () => void;
  disconnect: () => void;
  
  loadCronStatus: () => Promise<void>;
  loadCronJobs: () => Promise<void>;
  loadCronRuns: (jobId: string) => Promise<void>;
  addCronJob: (job: Partial<CronJob>) => Promise<void>;
  updateCronJob: (id: string, patch: Partial<CronJob>) => Promise<void>;
  toggleCronJob: (id: string, enabled: boolean) => Promise<void>;
  removeCronJob: (id: string) => Promise<void>;
  runCronJob: (id: string) => Promise<void>;
  
  loadConfig: () => Promise<void>;
  applyConfig: (config: Record<string, unknown>) => Promise<void>;
  
  loadAgents: () => Promise<void>;
  loadChannels: () => Promise<void>;
  loadSessions: () => Promise<void>;
  loadSkills: () => Promise<void>;
  installSkill: (name: string, installId: string) => Promise<void>;
  updateSkill: (skillKey: string, patch: { enabled?: boolean; apiKey?: string; env?: Record<string, string> }) => Promise<void>;
  
  setChatSession: (sessionKey: string) => void;
  sendChatMessage: (message: string, attachments?: ChatAttachment[]) => Promise<void>;
  clearChat: () => void;
  addChatAttachment: (attachment: ChatAttachment) => void;
  removeChatAttachment: (id: string) => void;
  clearChatAttachments: () => void;
}

const defaultSettings: UiSettings = {
  gatewayUrl: import.meta.env.VITE_GATEWAY_URL || 'ws://192.168.1.25:5173/ws',
  token: import.meta.env.VITE_GATEWAY_TOKEN || '',
  theme: 'system',
};

export const useGatewayStore = create<GatewayState>()(
  persist(
    (set, get) => ({
      client: null,
      connectionState: 'disconnected',
      error: null,
      hello: null,
      
      cronJobs: [],
      cronStatus: null,
      cronRuns: [],
      cronRunsJobId: null,
      
      config: null,
      configLoading: false,
      
      agents: null,
      channels: null,
      sessions: null,
      skills: null,
      
      chatMessages: [],
      chatSessionKey: 'agent:main:main',
      chatLoading: false,
      chatAttachments: [],
      activeTools: [],
      chatThinking: '',
      
      settings: defaultSettings,
      
      setSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },
      
      connect: () => {
        const { settings, client } = get();
        
        if (client) {
          client.stop();
        }
        
        set({ connectionState: 'connecting', error: null });
        
        const newClient = createGatewayClient({
          url: settings.gatewayUrl,
          token: settings.token,
          onHello: (hello) => {
            const defaultSessionKey = hello.snapshot?.sessionDefaults?.mainSessionKey || 'agent:main:main';
            set((state) => ({
              connectionState: 'connected',
              hello,
              error: null,
              chatSessionKey: state.chatSessionKey || defaultSessionKey,
            }));
          },
          onClose: () => {
            set({ connectionState: 'disconnected' });
          },
          onError: (error) => {
            set({ connectionState: 'error', error: error.message });
          },
          onEvent: (evt: GatewayEventFrame) => {
            if (evt.event === 'chat') {
              const payload = evt.payload as { 
                message?: { role: string; content: Array<{ type: string; text: string }> };
                state: string;
                runId?: string;
                sessionKey?: string;
              };
              const msg = payload.message;
              const content = msg?.content?.[0]?.text || '';
              const runId = payload.runId;
              
              if (!msg || !runId) return;
              
              set((state) => {
                const existingIndex = state.chatMessages.findIndex(m => m.runId === runId);
                
                if (payload.state === 'delta') {
                  // Update existing message or add new
                  if (existingIndex >= 0) {
                    const updated = [...state.chatMessages];
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      content: updated[existingIndex].content + content,
                    };
                    return { chatMessages: updated, chatLoading: true };
                  } else {
                    return {
                      chatMessages: [
                        ...state.chatMessages,
                        {
                          role: msg.role as 'user' | 'assistant',
                          content,
                          timestamp: Date.now(),
                          runId,
                        },
                      ],
                      chatLoading: true,
                    };
                  }
                }
                
                if (payload.state === 'final') {
                  // Final message - replace delta content
                  if (existingIndex >= 0) {
                    const updated = [...state.chatMessages];
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      content,
                    };
                    return { chatMessages: updated, chatLoading: false, chatThinking: '' };
                  } else {
                    return {
                      chatMessages: [
                        ...state.chatMessages,
                        {
                          role: msg.role as 'user' | 'assistant',
                          content,
                          timestamp: Date.now(),
                          runId,
                        },
                      ],
                      chatLoading: false,
                      chatThinking: '',
                    };
                  }
                }
                
                return {};
              });
            }
            
            // Handle tool events
            if (evt.event === 'tool') {
              const payload = evt.payload as {
                runId?: string;
                toolCallId?: string;
                toolName?: string;
                args?: string;
                output?: string;
                state?: string;
              };
              
              if (!payload.toolCallId) return;
              
              set((state) => {
                if (!payload.toolCallId) return {};
                
                const existingIndex = state.activeTools.findIndex(t => t.id === payload.toolCallId);
                
                if (payload.state === 'start') {
                  const newTool: ToolCall = {
                    id: payload.toolCallId,
                    name: payload.toolName || 'unknown',
                    args: payload.args,
                    status: 'running',
                    startedAt: Date.now(),
                  };
                  return { activeTools: [...state.activeTools, newTool] };
                }
                
                if (payload.state === 'done' || payload.state === 'error') {
                  if (existingIndex >= 0) {
                    const updated = [...state.activeTools];
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      output: payload.output,
                      status: payload.state === 'error' ? 'error' : 'done',
                    };
                    return { activeTools: updated };
                  }
                }
                
                return {};
              });
            }
            
            // Handle thinking events
            if (evt.event === 'thinking') {
              const payload = evt.payload as {
                runId?: string;
                text?: string;
                state?: string;
              };
              
              if (!payload.text) return;
              
              set((state) => {
                if (payload.state === 'delta') {
                  return { chatThinking: state.chatThinking + payload.text };
                }
                if (payload.state === 'final') {
                  return { chatThinking: '' };
                }
                return {};
              });
            }
          },
        });
        
        newClient.start();
        set({ client: newClient });
      },
      
      disconnect: () => {
        const { client } = get();
        if (client) {
          client.stop();
        }
        set({ client: null, connectionState: 'disconnected', hello: null });
      },
      
      loadCronStatus: async () => {
        const { client } = get();
        if (!client) return;
        try {
          const status = await client.request<CronStatus>('cron.status', {});
          set({ cronStatus: status });
        } catch (err) {
          console.error('Failed to load cron status:', err);
        }
      },
      
      loadCronJobs: async () => {
        const { client } = get();
        if (!client) return;
        try {
          const res = await client.request<{ jobs?: CronJob[] }>('cron.list', {});
          set({ cronJobs: res.jobs ?? [] });
        } catch (err) {
          console.error('Failed to load cron jobs:', err);
        }
      },
      
      addCronJob: async (job) => {
        const { client } = get();
        if (!client) return;
        await client.request('cron.add', job);
        await get().loadCronJobs();
      },
      
      updateCronJob: async (id, patch) => {
        const { client } = get();
        if (!client) return;
        await client.request('cron.update', { id, patch });
        await get().loadCronJobs();
      },
      
      toggleCronJob: async (id, enabled) => {
        const { client } = get();
        if (!client) return;
        await client.request('cron.update', { id, patch: { enabled } });
        await get().loadCronJobs();
      },
      
      removeCronJob: async (id) => {
        const { client } = get();
        if (!client) return;
        await client.request('cron.remove', { id });
        await get().loadCronJobs();
      },
      
      runCronJob: async (id) => {
        const { client } = get();
        if (!client) return;
        await client.request('cron.run', { id, mode: 'force' });
      },
      
      loadCronRuns: async (jobId) => {
        const { client } = get();
        if (!client) return;
        try {
          const res = await client.request<{ entries?: CronRunLogEntry[] }>('cron.runs', { id: jobId, limit: 50 });
          set({ cronRuns: res.entries ?? [], cronRunsJobId: jobId });
        } catch (err) {
          console.error('Failed to load cron runs:', err);
        }
      },
      
      loadConfig: async () => {
        const { client } = get();
        if (!client) return;
        set({ configLoading: true });
        try {
          const config = await client.request<ConfigSnapshot>('config.get', {});
          set({ config, configLoading: false });
        } catch (err) {
          console.error('Failed to load config:', err);
          set({ configLoading: false });
        }
      },
      
      applyConfig: async (config) => {
        const { client } = get();
        if (!client) return;
        await client.request('config.apply', { config });
        await get().loadConfig();
      },
      
      loadAgents: async () => {
        const { client } = get();
        if (!client) return;
        try {
          const agents = await client.request<AgentsListResult>('agents.list', {});
          set({ agents });
        } catch (err) {
          console.error('Failed to load agents:', err);
        }
      },
      
      loadChannels: async () => {
        const { client } = get();
        if (!client) return;
        try {
          const channels = await client.request<ChannelsStatusSnapshot>('channels.status', {});
          set({ channels });
        } catch (err) {
          console.error('Failed to load channels:', err);
        }
      },
      
      loadSessions: async () => {
        const { client } = get();
        if (!client) return;
        try {
          const sessions = await client.request<SessionsListResult>('sessions.list', {});
          set({ sessions });
        } catch (err) {
          console.error('Failed to load sessions:', err);
        }
      },
      
      loadSkills: async () => {
        const { client } = get();
        if (!client) return;
        try {
          const skills = await client.request<SkillStatusReport>('skills.status', {});
          set({ skills });
        } catch (err) {
          console.error('Failed to load skills:', err);
        }
      },
      
      installSkill: async (name: string, installId: string) => {
        const { client } = get();
        if (!client) return;
        await client.request('skills.install', { name, installId });
        await get().loadSkills();
      },
      
      updateSkill: async (skillKey: string, patch: { enabled?: boolean; apiKey?: string; env?: Record<string, string> }) => {
        const { client } = get();
        if (!client) return;
        await client.request('skills.update', { skillKey, ...patch });
        await get().loadSkills();
      },
      
      setChatSession: (sessionKey: string) => {
        set({ chatSessionKey: sessionKey, chatMessages: [], chatLoading: true });
        const { client, connectionState } = get();
        if (!client || connectionState !== 'connected') return;
        
        client.request<{ messages?: Array<{ role: string; content: unknown; timestamp?: number }> }>('chat.history', {
          sessionKey,
          limit: 50,
        }).then((res) => {
          console.log('Chat history response:', res);
          const messages = res.messages?.map((m): ChatMessage => {
            let text = '';
            if (typeof m.content === 'string') {
              text = m.content;
            } else if (Array.isArray(m.content)) {
              text = m.content.map((c: unknown) => {
                if (typeof c === 'string') return c;
                if (c && typeof c === 'object') {
                  return (c as { text?: string }).text || '';
                }
                return '';
              }).join('');
            }
            const role = m.role === 'user' ? 'user' : m.role === 'assistant' ? 'assistant' : 'assistant';
            return {
              role,
              content: text,
              timestamp: m.timestamp || Date.now(),
            };
          }) || [];
          console.log('Parsed messages:', messages);
          set({ chatMessages: messages, chatLoading: false });
        }).catch((err) => {
          console.error('Failed to load chat history:', err);
          set({ chatMessages: [], chatLoading: false });
        });
      },
      
      sendChatMessage: async (message: string, attachments?: ChatAttachment[]) => {
        const { client, chatSessionKey, connectionState, chatAttachments } = get();
        if (!client || connectionState !== 'connected') {
          return;
        }
        
        const attachmentsToSend = attachments || chatAttachments;
        const userMessage = { 
          role: 'user' as const, 
          content: message, 
          timestamp: Date.now(),
          attachments: attachmentsToSend,
        };
        set((state) => ({
          chatMessages: [...state.chatMessages, userMessage],
          chatLoading: true,
          chatAttachments: [],
          activeTools: [],
          chatThinking: '',
        }));
        
        try {
          const payload: Record<string, unknown> = {
            sessionKey: chatSessionKey,
            message,
            deliver: false,
            idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          };
          
          // Add attachments if present
          if (attachmentsToSend.length > 0) {
            payload.attachments = attachmentsToSend.map(att => ({
              name: att.name,
              type: att.type,
              buffer: att.buffer,
            }));
          }
          
          await client.request('chat.send', payload);
        } catch (err) {
          console.error('Failed to send message:', err);
          set({ chatLoading: false });
        }
      },
      
      clearChat: () => {
        set({ chatMessages: [], chatAttachments: [], activeTools: [], chatThinking: '' });
      },
      
      addChatAttachment: (attachment: ChatAttachment) => {
        set((state) => ({
          chatAttachments: [...state.chatAttachments, attachment],
        }));
      },
      
      removeChatAttachment: (id: string) => {
        set((state) => ({
          chatAttachments: state.chatAttachments.filter(a => a.id !== id),
        }));
      },
      
      clearChatAttachments: () => {
        set({ chatAttachments: [] });
      },
    }),
    {
      name: 'claw-ui-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
