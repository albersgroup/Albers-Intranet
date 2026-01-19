import { useState } from "react";
import { Send, Paperclip, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ChatInputProps {
  onSendMessage?: (message: string, files?: File[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({ onSendMessage, placeholder = "Ask about capture processes, SOPs, or upload documents...", disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const handleSend = () => {
    if (message.trim() || files.length > 0) {
      onSendMessage?.(message, files);
      setMessage("");
      setFiles([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="border-t border-border bg-background p-4">
      <Alert className="mb-3 bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700" data-testid="alert-cui-warning">
        <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
        <AlertDescription className="text-xs font-medium text-amber-900 dark:text-amber-100">
          Do not upload any documents containing CUI material.
        </AlertDescription>
      </Alert>
      
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="text-xs bg-muted px-3 py-1 rounded-full flex items-center gap-2"
              data-testid={`file-${index}`}
            >
              <Paperclip className="w-3 h-3" />
              {file.name}
              <button
                onClick={() => setFiles(files.filter((_, i) => i !== index))}
                className="ml-1 hover:text-destructive"
                data-testid={`remove-file-${index}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[48px] max-h-[200px] resize-none"
          data-testid="input-message"
        />
        
        <div className="flex flex-col gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => document.getElementById("file-upload")?.click()}
            data-testid="button-attach"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <input
            id="file-upload"
            type="file"
            multiple
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            size="icon"
            onClick={handleSend}
            disabled={disabled || (!message.trim() && files.length === 0)}
            data-testid="button-send"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
