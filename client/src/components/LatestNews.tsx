import { sanitizeHtml } from "@/lib/sanitize";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Newspaper, Calendar, ArrowRight, Archive, X, Pin, Paperclip, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { NewsArticle, Division } from "@shared/schema";

interface LatestNewsProps {
  division: Division;
  limit?: number;
  showArchiveLink?: boolean;
  title?: string;
}

const DIVISION_NAMES: Record<string, string> = {
  corporate: "Albers Corporate",
  defense: "Albers Defense",
  industrials: "Albers Industrials",
  advanced_programs: "Albers Advanced Programs",
};

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, '')  // Remove complete HTML tags
    .replace(/<[^>]*$/g, '')  // Remove incomplete tags at end (e.g., "</str" from truncated "</strong>")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export default function LatestNews({ division, limit = 3, showArchiveLink = true, title = "Latest News" }: LatestNewsProps) {
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  
  const { data: articles, isLoading, error } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news", division, limit],
    queryFn: async () => {
      const response = await fetch(`/api/news?division=${division}&limit=${limit}`);
      if (!response.ok) throw new Error("Failed to fetch news");
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-primary" />
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-primary" />
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Unable to load news at this time.</p>
        </CardContent>
      </Card>
    );
  }

  const archivePath = "/news-archive";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" />
          <CardTitle>{title}</CardTitle>
        </div>
        {showArchiveLink && (
          <Link href={archivePath}>
            <Button variant="ghost" size="sm" className="gap-1" data-testid="link-news-archive">
              <Archive className="w-4 h-4" />
              View All Bulletins
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {!articles || articles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No news articles yet.</p>
            <p className="text-xs mt-1">Check back later for updates.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.slice(0, limit).map((article) => (
              <article 
                key={article.id} 
                className="border-b border-border pb-4 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                onClick={() => setSelectedArticle(article)}
                data-testid={`news-article-${article.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {(article as any).isPinned && (
                      <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    )}
                    <h3 className="font-semibold text-sm leading-tight">{article.title}</h3>
                  </div>
                  {isNew(article.publishedAt) && (
                    <Badge variant="secondary" className="bg-emerald-600 text-white text-xs flex-shrink-0">
                      New
                    </Badge>
                  )}
                </div>
                <div 
                  className="bulletin-content text-sm mt-1 line-clamp-3"
                  dangerouslySetInnerHTML={sanitizeHtml(article.content || article.summary || '')}
                />
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(article.publishedAt)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>

      {/* Article Detail Modal */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {DIVISION_NAMES[selectedArticle.division] || selectedArticle.division}
                  </Badge>
                </div>
                <DialogTitle className="text-xl">{selectedArticle.title}</DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Published on {formatDateFull(selectedArticle.publishedAt)}</span>
                </div>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                {selectedArticle.summary && (
                  <p className="text-primary font-medium">{stripHtml(selectedArticle.summary)}</p>
                )}
                <div 
                  className="bulletin-content max-w-none text-foreground"
                  dangerouslySetInnerHTML={sanitizeHtml(selectedArticle.content)}
                />
                {(selectedArticle as any).attachmentUrl && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => window.open((selectedArticle as any).attachmentUrl, '_blank', 'noopener,noreferrer')}
                      className="gap-2"
                      data-testid="button-view-article-attachment"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Attachment: {(selectedArticle as any).attachmentName || 'Document'}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function formatDate(dateValue: Date | string | null | undefined): string {
  if (!dateValue) return "Date not available";
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "Date not available";
    return format(date, "MMM d, yyyy");
  } catch {
    return "Date not available";
  }
}

function formatDateFull(dateValue: Date | string | null | undefined): string {
  if (!dateValue) return "Date not available";
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "Date not available";
    return format(date, "MMMM d, yyyy 'at' h:mm a");
  } catch {
    return "Date not available";
  }
}

function isNew(publishedAt: Date | string | null | undefined): boolean {
  if (!publishedAt) return false;
  try {
    const published = new Date(publishedAt);
    if (isNaN(published.getTime())) return false;
    const now = new Date();
    const daysDiff = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  } catch {
    return false;
  }
}
