import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface CaptureQuestionCardProps {
  question: string;
  example?: string;
  response?: string;
  onResponseChange?: (response: string) => void;
}

export default function CaptureQuestionCard({
  question,
  example,
  response = "",
  onResponseChange
}: CaptureQuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localResponse, setLocalResponse] = useState(response);

  const handleResponseChange = (value: string) => {
    setLocalResponse(value);
    onResponseChange?.(value);
  };

  return (
    <div className="border border-border rounded-md bg-card" data-testid="card-question">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover-elevate active-elevate-2"
        data-testid="button-expand-question"
      >
        <span className="font-semibold text-[15px] text-left">{question}</span>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-6 pb-4 space-y-4 border-t border-border">
          {example && (
            <div className="pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                EXAMPLE/NOTE
              </p>
              <p className="text-sm italic text-muted-foreground">{example}</p>
            </div>
          )}

          <div>
            <label
              htmlFor={`response-${question}`}
              className="text-xs font-medium text-muted-foreground mb-2 block"
            >
              YOUR RESPONSE
            </label>
            <Textarea
              id={`response-${question}`}
              value={localResponse}
              onChange={(e) => handleResponseChange(e.target.value)}
              placeholder="Enter your response here..."
              className="min-h-[100px]"
              data-testid="input-response"
            />
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => console.log("Saved:", localResponse)}
              data-testid="button-save"
            >
              Save Response
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
