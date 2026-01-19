import { useState, useEffect } from "react";
import { X, Minimize2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { cn } from "@/lib/utils";
import albersAvatar from "@assets/image_1761688974375.png";

interface Message {
  id: string;
  role: "user" | "agent";
  message: string;
  timestamp: string;
}

interface FloatingChatbotProps {
  pageContext?: string;
  currentData?: Record<string, any>;
  pageName?: string;
}

export default function FloatingChatbot({ 
  pageContext = "general", 
  currentData = {},
  pageName = "Home"
}: FloatingChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize messages once - don't reset when pageContext changes
  // Use the initial pageContext value for the first greeting
  const [messages, setMessages] = useState<Message[]>(() => {
    let initialGreeting = "Hey! I'm Albers Bot. I can help you navigate the intranet, find SOPs, or answer questions about our process. What brings you here today?";
    
    if (pageContext === "capture-questions") {
      initialGreeting = "Hey! I can see you're working on the Capture Questions form. Need help polishing any responses or figuring out what to write? Just ask!";
    } else if (pageContext === "sop-library") {
      initialGreeting = "Hey! Looking for a specific SOP or trying to understand how something works? I'm here to help!";
    } else if (pageContext === "bid-no-bid") {
      initialGreeting = "Hey! I can help you fill out the Bid/No Bid chart. Need guidance on what to include in any section, or want to understand the decision-making process? Just ask!";
    }
    
    return [{
      id: "1",
      role: "agent",
      message: initialGreeting,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }];
  });
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const handleSendMessage = async (message: string, files?: File[]) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Handle file uploads first
    let fileUrls: string[] = [];
    if (files && files.length > 0) {
      try {
        for (const file of files) {
          // Get upload URL from backend
          const uploadResponse = await fetch('/api/objects/upload', {
            method: 'POST',
          });
          const { uploadURL } = await uploadResponse.json();
          
          // Upload file to object storage
          await fetch(uploadURL, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': file.type,
            },
          });
          
          // Extract object path from upload URL
          const url = new URL(uploadURL);
          const objectPath = url.pathname;
          fileUrls.push(objectPath);
        }
        setUploadedFiles(prev => [...prev, ...fileUrls]);
      } catch (error) {
        console.error('Error uploading files:', error);
      }
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      message: files && files.length > 0 
        ? `${message}\n\n📎 Attached: ${files.map(f => f.name).join(", ")}`
        : message,
      timestamp
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build conversation history for API
      const apiMessages = messages
        .filter(m => m.role !== "agent" || m.id !== "1") // Exclude initial greeting
        .map(m => ({
          role: m.role === "agent" ? "assistant" : "user",
          content: m.message
        }));
      
      // Add new user message
      apiMessages.push({
        role: "user",
        content: message
      });

      // Call chat API with context
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          uploadedFiles: fileUrls.length > 0 ? fileUrls : uploadedFiles,
          pageContext,
          currentData,
          pageName
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const data = await response.json();
      
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        message: data.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        message: "I apologize, but I'm having trouble connecting right now. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            onClick={() => setIsOpen(true)}
            className="bg-primary text-primary-foreground shadow-lg border-0"
            data-testid="button-open-chatbot"
          >
            <div className="flex items-center gap-3">
              <div className="relative" data-testid="avatar-albers-bot">
                <img 
                  src={albersAvatar} 
                  alt="Albers Bot" 
                  className="w-12 h-12 rounded-lg"
                />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-primary" data-testid="indicator-online"></div>
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span data-testid="text-chatbot-name">Albers Bot</span>
                </div>
                <p className="text-xs opacity-90" data-testid="text-chatbot-preview">
                  {pageContext === "capture-questions" 
                    ? "Need help refining your responses?" 
                    : pageContext === "sop-library"
                    ? "Find SOPs and guidance"
                    : pageContext === "bid-no-bid"
                    ? "Get help with the Bid/No Bid chart"
                    : "Ask me anything about our processes"}
                </p>
              </div>
            </div>
          </Button>
        </div>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-card border border-border rounded-md shadow-2xl flex flex-col z-50"
          data-testid="window-chatbot"
        >
          <div className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground p-4 rounded-t-md flex items-center justify-between" data-testid="header-chatbot">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src={albersAvatar} 
                  alt="Albers Bot" 
                  className="w-12 h-12 rounded-lg"
                />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-primary"></div>
              </div>
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Albers Bot
                </h3>
                <p className="text-xs opacity-90">On {pageName} page</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="text-primary-foreground"
                onClick={() => setIsOpen(false)}
                data-testid="button-minimize-chatbot"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-primary-foreground"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-chatbot"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                message={msg.message}
                timestamp={msg.timestamp}
              />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>

          <div className="border-t border-border bg-muted/30">
            <ChatInput
              onSendMessage={handleSendMessage}
              placeholder={
                pageContext === "capture-questions"
                  ? "Ask me to improve your text, suggest ideas, or answer questions..."
                  : pageContext === "bid-no-bid"
                  ? "Ask about chart sections, decision criteria, or what to include..."
                  : "Ask about SOPs, gates, or processes..."
              }
              disabled={isLoading}
            />
          </div>
        </div>
      )}
    </>
  );
}
