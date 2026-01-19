import { User, ExternalLink, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import albersAvatar from "@assets/image_1761688974375.png";

interface ChatMessageProps {
  message: string;
  role: "user" | "agent";
  timestamp?: string;
}

function parseMessageWithLinks(message: string) {
  const parts: (string | JSX.Element)[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = linkRegex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push(message.slice(lastIndex, match.index));
    }

    const linkText = match[1];
    const linkUrl = match[2];
    const isInternal = linkUrl.startsWith('/');
    const isExternal = linkUrl.startsWith('http');

    if (isInternal) {
      parts.push(
        <Link
          key={`link-${keyIndex++}`}
          href={linkUrl}
          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline underline-offset-2 font-medium"
          data-testid={`chat-link-${linkUrl.replace(/\//g, '-')}`}
        >
          <FileText className="w-3.5 h-3.5" />
          {linkText}
        </Link>
      );
    } else if (isExternal) {
      parts.push(
        <a
          key={`link-${keyIndex++}`}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline underline-offset-2 font-medium"
          data-testid={`chat-external-link-${keyIndex}`}
        >
          {linkText}
          <ExternalLink className="w-3 h-3" />
        </a>
      );
    } else {
      parts.push(
        <span key={`link-${keyIndex++}`} className="text-primary font-medium">
          {linkText}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < message.length) {
    parts.push(message.slice(lastIndex));
  }

  return parts.length > 0 ? parts : message;
}

function formatMessageContent(message: string) {
  const parsed = parseMessageWithLinks(message);
  
  if (typeof parsed === 'string') {
    return parsed;
  }
  
  return parsed.map((part, index) => {
    if (typeof part === 'string') {
      return <span key={`text-${index}`}>{part}</span>;
    }
    return part;
  });
}

export default function ChatMessage({ message, role, timestamp }: ChatMessageProps) {
  const isAgent = role === "agent";
  
  return (
    <div
      className={cn(
        "flex gap-3 max-w-[680px]",
        isAgent ? "self-start" : "self-end flex-row-reverse"
      )}
      data-testid={`message-${role}`}
    >
      <div className="flex-shrink-0">
        {isAgent ? (
          <img 
            src={albersAvatar} 
            alt="Albers Bot" 
            className="w-8 h-8 rounded-lg"
          />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground">
            <User className="w-4 h-4" />
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-1 flex-1">
        <div
          className={cn(
            "rounded-lg px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap",
            isAgent
              ? "bg-card text-card-foreground border border-card-border"
              : "bg-primary text-primary-foreground"
          )}
        >
          {isAgent ? formatMessageContent(message) : message}
        </div>
        {timestamp && (
          <span className="text-[11px] text-muted-foreground px-1">
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}
