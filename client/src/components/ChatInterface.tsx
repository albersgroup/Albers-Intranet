import { useState } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "agent";
  message: string;
  timestamp: string;
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "agent",
    message: "Hello! I'm your BOU Training Agent for Albers Aerospace. I can help you with:\n\n• Understanding BD/Capture/Proposal processes\n• Navigating Gates 1-3 requirements\n• Guidance on SOPs and procedures\n• Answering questions about opportunity phases\n\nYou can also upload documents or screenshots for context-specific guidance. How can I assist you today?",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
];

const suggestedActions = [
  "What do I need for Gate 1 review?",
  "Explain the Capture Phase",
  "Show me Bid/No-Bid criteria",
  "What is the AOP process?"
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const handleSendMessage = (message: string, files?: File[]) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      message: files && files.length > 0 
        ? `${message}\n\n📎 Attached: ${files.map(f => f.name).join(", ")}`
        : message,
      timestamp
    };
    
    setMessages(prev => [...prev, userMessage]);

    // Simulate agent response
    setTimeout(() => {
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        message: "I understand your question. Based on our SOPs and procedures, I can provide you with detailed guidance. This is a simulated response - in the full application, I'll analyze your documents and provide specific next-step recommendations tailored to your opportunity.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, agentMessage]);
    }, 1000);
  };

  const handleSuggestedAction = (action: string) => {
    handleSendMessage(action);
  };

  return (
    <div className="flex flex-col h-full" data-testid="chat-interface">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            message={msg.message}
            timestamp={msg.timestamp}
          />
        ))}
      </div>

      {messages.length === 1 && (
        <div className="px-6 pb-4">
          <p className="text-xs text-muted-foreground mb-3">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestedAction(action)}
                className="rounded-full text-xs"
                data-testid={`action-${index}`}
              >
                {action}
              </Button>
            ))}
          </div>
        </div>
      )}

      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
}
