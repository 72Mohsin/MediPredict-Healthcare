import { AIChatPanel } from '@/components/AIChatPanel';

export default function ChatPage() {
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">MediBot AI Chat</h1>
        <p className="text-muted-foreground">
          Chat with DeepSeek-R1 about your symptoms, past predictions, home remedies, and which doctors to visit.
          Your full conversation history is saved to your account.
        </p>
      </div>
      <AIChatPanel
        className="min-h-[600px]"
        initialMessage={undefined}
      />
    </div>
  );
}
