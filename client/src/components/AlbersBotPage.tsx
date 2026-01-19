import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Bot, User, Sparkles, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import chatbotAvatar from "@assets/image_1761793743156.png";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface BotSetting {
  id: string;
  setting_key: string;
  setting_value: string;
}

const DEFAULT_GREETING = "Hello! I'm Albers Bot, your AI assistant with full knowledge of all SOPs, processes, capture questions, and business development tools in this system. How can I help you today?";

export default function AlbersBotPage() {
  const { data: greetingSetting } = useQuery<BotSetting | null>({
    queryKey: ["/api/bou/bot-settings", "greeting"],
    queryFn: async () => {
      const res = await fetch("/api/bou/bot-settings/greeting");
      if (!res.ok) return null;
      return res.json();
    }
  });

  const greeting = greetingSetting?.setting_value || DEFAULT_GREETING;

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: greeting }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (greetingSetting?.setting_value) {
      setMessages([{ role: "assistant", content: greetingSetting.setting_value }]);
    }
  }, [greetingSetting?.setting_value]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
          pageContext: "albers-bot-full",
          currentData: {}
        })
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to get response from Albers Bot. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-background">
      <div className="p-4 sm:p-6 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-start gap-3 sm:gap-4">
          <img 
            src={chatbotAvatar} 
            alt="Albers Bot" 
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">Albers Bot</h1>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
              AI assistant with complete knowledge of all SOPs, processes, and business development tools
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {message.role === "user" ? (
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
            ) : (
              <img 
                src={chatbotAvatar} 
                alt="Albers Bot" 
                className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
              />
            )}

            <div className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[75%]`}>
              <div className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-3 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border"
              }`}>
                <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">{message.content}</p>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <img 
              src={chatbotAvatar} 
              alt="Albers Bot" 
              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
            />
            <div className="bg-card border border-border rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-xs sm:text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 sm:p-6 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about SOPs, processes, or business development..."
            className="resize-none min-h-[44px] max-h-[120px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            disabled={isLoading}
            data-testid="input-chat"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 h-[44px] w-[44px]"
            data-testid="button-send"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
