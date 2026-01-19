import { FileText, BookOpen, Star, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface SOPCardProps {
  title: string;
  description: string;
  category: string;
  usedCount?: number;
  icon?: React.ReactNode;
  onView?: () => void;
  isNew?: boolean;
  categoryColor?: string;
}

export default function SOPCard({
  title,
  description,
  category,
  usedCount = 0,
  icon,
  onView,
  isNew = false,
  categoryColor
}: SOPCardProps) {
  const { toast } = useToast();
  const [isFavorited, setIsFavorited] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorited(!isFavorited);
    toast({
      title: isFavorited ? "Removed from favorites" : "Added to favorites",
      description: isFavorited ? `"${title}" removed from your favorites` : `"${title}" added to your favorites`,
    });
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Create a shareable URL (in production, this would be a full URL)
      const sopUrl = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(title)}`;
      await navigator.clipboard.writeText(sopUrl);
      toast({
        title: "Link copied!",
        description: `SOP link copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="bg-card border border-card-border rounded-md p-4 hover-elevate active-elevate-2 transition-all">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className={`w-10 h-10 rounded-lg ${categoryColor || 'bg-primary'} flex items-center justify-center flex-shrink-0`}>
            {icon}
          </div>
        ) : (
          <div className={`w-10 h-10 rounded-lg ${categoryColor || 'bg-primary'} flex items-center justify-center flex-shrink-0`}>
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-sm leading-tight">{title}</h3>
            {isNew && (
              <Badge variant="default" className="bg-amber-500 text-white text-xs whitespace-nowrap flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                New
              </Badge>
            )}
          </div>
          
          <Badge variant="secondary" className="mb-2 text-xs bg-slate-700 text-white border-slate-600">
            {category}
          </Badge>
          
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            {description}
          </p>
          
          <div className="flex items-center justify-between mb-3">
            {usedCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Used {usedCount} time{usedCount !== 1 ? 's' : ''}
              </p>
            )}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFavorite}
                className="h-7 w-7 p-0"
                data-testid="button-favorite-sop"
              >
                <Star className={`w-3.5 h-3.5 ${isFavorited ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="h-7 w-7 p-0"
                data-testid="button-share-sop"
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          
          <Button
            onClick={onView}
            size="sm"
            className="w-full"
            data-testid="button-view-sop"
          >
            <BookOpen className="w-3.5 h-3.5 mr-2" />
            View SOP
          </Button>
        </div>
      </div>
    </div>
  );
}
