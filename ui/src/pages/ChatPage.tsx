import { useEffect, useState, useRef, useCallback } from 'react';
import { useGatewayStore } from '@/lib/store';
import { Card, CardHeader, CardContent, Button, Input, Select, Badge } from '@/components';
import { MessageSquare, Send, Trash2, RefreshCw, Bot, Paperclip, X, Loader2, Wrench, CheckCircle, XCircle } from 'lucide-react';
import type { ChatMessage, ChatAttachment, ToolCall } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`px-4 py-3 rounded-2xl max-w-[85%] overflow-hidden ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800 text-gray-100'
        }`}
      >
        {/* Attachments for user messages */}
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.attachments.map((att) => (
              <div key={att.id} className="flex items-center gap-1 bg-blue-700 px-2 py-1 rounded text-xs">
                <Paperclip size={12} />
                <span>{att.mimeType}</span>
              </div>
            ))}
          </div>
        )}
        
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        ) : (
          <div className="markdown-content text-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                h1: ({ children }) => <h1 className="text-xl font-bold mb-2 text-blue-400">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-bold mb-2 text-blue-400">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-bold mb-1 text-blue-400">{children}</h3>,
                p: ({ children }) => <p className="mb-2">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match;
                  return isInline ? (
                    <code className="bg-gray-900 px-1.5 py-0.5 rounded text-xs font-mono text-pink-400" {...props}>{children}</code>
                  ) : (
                    <code className={`${className} block bg-gray-900 p-3 rounded-lg overflow-x-auto text-xs font-mono my-2`} {...props}>{children}</code>
                  );
                },
                pre: ({ children }) => <pre className="bg-gray-900 p-3 rounded-lg overflow-x-auto my-2 text-xs">{children}</pre>,
                a: ({ href, children }) => <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-600 pl-3 my-2 text-gray-400">{children}</blockquote>,
                hr: () => <hr className="border-gray-600 my-3" />,
                table: ({ children }) => <table className="w-full border-collapse my-2 text-xs">{children}</table>,
                th: ({ children }) => <th className="border border-gray-600 p-1 text-left">{children}</th>,
                td: ({ children }) => <td className="border border-gray-600 p-1">{children}</td>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCallItem({ tool }: { tool: ToolCall }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
      tool.status === 'running' ? 'bg-yellow-900/30 border border-yellow-700' :
      tool.status === 'done' ? 'bg-green-900/30 border border-green-700' :
      'bg-red-900/30 border border-red-700'
    }`}>
      {tool.status === 'running' ? (
        <Loader2 size={14} className="animate-spin text-yellow-400" />
      ) : tool.status === 'done' ? (
        <CheckCircle size={14} className="text-green-400" />
      ) : (
        <XCircle size={14} className="text-red-400" />
      )}
      <Wrench size={14} className="text-gray-400" />
      <span className="font-mono text-blue-400">{tool.name}</span>
      {tool.output && (
        <span className="text-gray-400 text-xs truncate max-w-[200px]">
          → {tool.output.substring(0, 50)}...
        </span>
      )}
    </div>
  );
}

function AttachmentItem({ attachment, onRemove }: { attachment: ChatAttachment; onRemove: () => void }) {
  const isImage = attachment.mimeType.startsWith('image/');
  
  return (
    <div className="relative flex items-center gap-2 bg-gray-700 px-3 py-2 rounded-lg">
      {isImage && attachment.dataUrl && (
        <img 
          src={attachment.dataUrl} 
          alt={attachment.id}
          className="w-10 h-10 object-cover rounded"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{attachment.mimeType}</p>
        <p className="text-xs text-gray-400">{attachment.mimeType}</p>
      </div>
      <button
        onClick={onRemove}
        className="p-1 hover:bg-gray-600 rounded"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ChatPage() {
  const {
    agents,
    sessions,
    chatMessages,
    chatSessionKey,
    chatLoading,
    connectionState,
    chatAttachments,
    activeTools,
    chatThinking,
    loadAgents,
    loadSessions,
    setChatSession,
    sendChatMessage,
    clearChat,
    addChatAttachment,
    removeChatAttachment,
    clearChatAttachments,
  } = useGatewayStore();
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (connectionState === 'connected' && sessions?.sessions) {
      setChatSession(chatSessionKey);
    }
  }, [connectionState, sessions]);

  useEffect(() => {
    loadAgents();
    loadSessions();
  }, []);

  useEffect(() => {
    if (connectionState === 'connected') {
      loadSessions();
      loadAgents();
    }
  }, [connectionState]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTools]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        addChatAttachment({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          dataUrl,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addChatAttachment]);

  const handleSend = async () => {
    if ((!input.trim() && chatAttachments.length === 0) || chatLoading || connectionState !== 'connected') return;
    const message = input.trim();
    setInput('');
    clearChatAttachments();
    await sendChatMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sessionOptions = sessions?.sessions.map((s) => ({
    value: s.key,
    label: s.displayName || s.label || s.key,
  })) || [];

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chat</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Interact with your agents</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { loadAgents(); loadSessions(); }}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          <Button variant="danger" onClick={clearChat}>
            <Trash2 size={16} className="mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Session Selector */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-gray-400" />
              {sessionOptions.length > 0 ? (
                <Select
                  value={chatSessionKey}
                  onChange={(e) => setChatSession(e.target.value)}
                  options={sessionOptions}
                  className="min-w-[200px]"
                />
              ) : (
                <span className="text-sm text-gray-500">Loading sessions...</span>
              )}
            </div>
            {connectionState !== 'connected' ? (
              <Badge variant="danger">Not connected</Badge>
            ) : chatLoading ? (
              <Badge variant="info">
                <Loader2 size={12} className="mr-1 animate-spin" />
                Thinking...
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="flex-1 flex flex-col min-h-0 p-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {chatMessages.length === 0 && activeTools.length === 0 && !chatThinking ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <MessageSquare size={48} className="mb-4 opacity-50" />
                <p>No messages yet</p>
                <p className="text-sm mt-1">Start a conversation with your agent</p>
              </div>
            ) : (
              <>
                {/* Active Tools */}
                {activeTools.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Tools</p>
                    {activeTools.map((tool) => (
                      <ToolCallItem key={tool.id} tool={tool} />
                    ))}
                  </div>
                )}
                
                {/* Thinking indicator */}
                {chatThinking && (
                  <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Thinking...</span>
                    </div>
                    <p className="text-gray-300 text-sm mt-2 whitespace-pre-wrap">{chatThinking}</p>
                  </div>
                )}
                
                {/* Messages */}
                {chatMessages.map((msg, i) => (
                  <MessageBubble key={`${msg.timestamp}-${i}`} message={msg} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            {/* Attachments preview */}
            {chatAttachments.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {chatAttachments.map((att) => (
                  <AttachmentItem
                    key={att.id}
                    attachment={att}
                    onRemove={() => removeChatAttachment(att.id)}
                  />
                ))}
              </div>
            )}
            
            <div className="flex gap-2 items-end">
              {/* Attachment button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
                accept="image/*,.pdf,.txt,.json,.md"
              />
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={chatLoading || connectionState !== 'connected'}
              >
                <Paperclip size={16} />
              </Button>
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... (Shift+Enter for new line)"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none min-h-[60px] max-h-[200px]"
                rows={3}
                disabled={chatLoading || connectionState !== 'connected'}
              />
              <Button onClick={handleSend} disabled={(!input.trim() && chatAttachments.length === 0) || chatLoading || connectionState !== 'connected'} loading={chatLoading}>
                <Send size={16} />
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Press Enter to send, Shift+Enter for new line • Attach files with paperclip
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
