import { useEffect, useState, useRef } from 'react';
import { useGatewayStore } from '@/lib/store';
import { Card, CardHeader, CardContent, Button, Input, Select, Badge } from '@/components';
import { MessageSquare, Send, Trash2, RefreshCw, Bot } from 'lucide-react';
import type { ChatMessage } from '@/types';
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

export function ChatPage() {
  const {
    agents,
    sessions,
    chatMessages,
    chatSessionKey,
    chatLoading,
    connectionState,
    loadAgents,
    loadSessions,
    setChatSession,
    sendChatMessage,
    clearChat,
  } = useGatewayStore();
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  }, [chatMessages]);

  const handleSend = async () => {
    if (!input.trim() || chatLoading || connectionState !== 'connected') return;
    const message = input.trim();
    setInput('');
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
                <RefreshCw size={12} className="mr-1 animate-spin" />
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
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <MessageSquare size={48} className="mb-4 opacity-50" />
                <p>No messages yet</p>
                <p className="text-sm mt-1">Start a conversation with your agent</p>
              </div>
            ) : (
              <>
                {chatMessages.map((msg, i) => (
                  <MessageBubble key={`${msg.timestamp}-${i}`} message={msg} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... (Shift+Enter for new line)"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none min-h-[60px] max-h-[200px]"
                rows={3}
                disabled={chatLoading || connectionState !== 'connected'}
              />
              <Button onClick={handleSend} disabled={!input.trim() || chatLoading || connectionState !== 'connected'} loading={chatLoading}>
                <Send size={16} />
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
