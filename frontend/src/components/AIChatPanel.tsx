import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Send, Loader2, User, Bot, AlertCircle, Sparkles, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

interface AIChatPanelProps {
  symptoms?: string[];
  predictionId?: string;
  initialMessage?: string;
  className?: string;
}

function MessageContent({ content, streaming }: { content: string; streaming?: boolean }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
      {streaming && (
        <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse rounded-sm align-text-bottom" />
      )}
    </div>
  );
}

const QUICK_PROMPTS = [
  'What follow-up questions do you have?',
  'Which doctor should I see first?',
  'Give me home remedies for today',
  'How serious are my symptoms?',
  'What tests should I get done?',
];

export function AIChatPanel({ symptoms = [], predictionId, initialMessage, className = '' }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    api.health().then(h => setOllamaStatus(h.ollama === 'online' ? 'online' : 'offline')).catch(() => setOllamaStatus('offline'));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (symptoms.length > 0 && messages.length === 0 && ollamaStatus === 'online') {
      const greeting = initialMessage ||
        `Hello! I can see you're experiencing: ${symptoms.slice(0, 3).join(', ')}${symptoms.length > 3 ? ` and ${symptoms.length - 3} more` : ''}. What's been your most bothersome symptom?`;
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [symptoms, ollamaStatus]);

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    setInput('');
    setError('');
    setLoading(true);

    // Add user message
    const userMsg: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMsg]);

    // Add empty assistant bubble (will stream into it)
    const assistantIdx = messages.length + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    abortRef.current = new AbortController();

    try {
      const token = localStorage.getItem('medipredict_token');
      const params = new URLSearchParams({
        message: messageText,
        ...(sessionId ? { session_id: sessionId } : {}),
        ...(predictionId ? { prediction_id: predictionId } : {}),
        symptoms: symptoms.join(','),
      });

      const response = await fetch(`${BASE_URL}/chat/stream?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'session') {
              setSessionId(data.session_id);
            } else if (data.type === 'chunk') {
              accumulated += data.text;
              const captured = accumulated;
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: captured, streaming: true };
                }
                return updated;
              });
            } else if (data.type === 'done') {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, streaming: false };
                }
                return updated;
              });
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch (parseErr) {
            // skip malformed SSE lines
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError((e as Error).message || 'Connection failed');
      // Remove the empty assistant bubble on error
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading, messages.length, sessionId, predictionId, symptoms]);

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(undefined);
    setError('');
    setLoading(false);
  };

  return (
    <Card className={`flex flex-col border-0 shadow-lg ${className}`}>
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary/5 to-secondary/5 rounded-t-xl">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            MediBot
            <Badge
              className={`text-xs font-medium ${
                ollamaStatus === 'online'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : ollamaStatus === 'checking'
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
              }`}
            >
              {ollamaStatus === 'checking' ? '● Connecting' :
               ollamaStatus === 'online'   ? '● Online' : '● Offline'}
            </Badge>
          </CardTitle>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={reset} className="h-7 text-xs">
              <RotateCcw className="h-3 w-3 mr-1" />New Chat
            </Button>
          )}
        </div>
        {symptoms.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {symptoms.slice(0, 3).map(s => (
              <span key={s} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {s}
              </span>
            ))}
            {symptoms.length > 3 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                +{symptoms.length - 3} more
              </span>
            )}
          </div>
        )}
      </CardHeader>

      {ollamaStatus === 'offline' && (
        <Alert variant="destructive" className="m-3 mb-0 py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Ollama offline. Run: <code className="bg-destructive/20 px-1 rounded">ollama serve</code>
          </AlertDescription>
        </Alert>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1" style={{ height: '360px' }}>
        <div className="p-4 space-y-4">
          {messages.length === 0 && ollamaStatus === 'online' && (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <Sparkles className="h-10 w-10 mb-3 text-primary/30" />
              <p className="font-medium text-sm">Ask MediBot about your symptoms</p>
              <p className="text-xs mt-1 max-w-[200px]">I'll ask follow-up questions and suggest next steps</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center mt-1">
                  <Bot className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}
              <div className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-muted rounded-tl-sm'
              }`}>
                <MessageContent content={msg.content} streaming={msg.streaming} />
              </div>
              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center mt-1">
                  <User className="h-3.5 w-3.5 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}

          {/* Show spinner only when loading but no streaming content yet */}
          {loading && messages[messages.length - 1]?.content === '' && (
            <div className="flex gap-2.5 justify-start">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                <div className="flex gap-1 items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Quick prompts */}
      {messages.length <= 1 && ollamaStatus === 'online' && !loading && (
        <div className="px-3 pb-2 border-t pt-2">
          <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide font-medium">Quick ask</p>
          <div className="flex flex-wrap gap-1">
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                disabled={loading}
                className="text-[11px] px-2.5 py-1 rounded-full border bg-background hover:bg-muted transition-colors disabled:opacity-50 text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={ollamaStatus === 'online' ? 'Ask about your symptoms…' : 'Ollama offline'}
          disabled={loading || ollamaStatus !== 'online'}
          className="flex-1 text-sm"
        />
        <Button
          size="icon"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim() || ollamaStatus !== 'online'}
          className="shrink-0"
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </Card>
  );
}
