import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Newspaper, Search, Calendar, Building2, Shield, Factory, Sparkles, Pin, Paperclip, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeFormatDate } from "@/lib/utils";
import heroImage from "@assets/35705_1765410595094.jpg";

interface NewsArticle {
  id: number;
  division: string;
  title: string;
  summary: string;
  content: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  publishedAt: string;
  isArchived: boolean;
  isPinned: boolean;
}

const divisions = [
  { id: "corporate", label: "Albers Corporate", icon: Building2, color: "text-primary" },
  { id: "defense", label: "Albers Defense", icon: Shield, color: "text-blue-600" },
  { id: "industrials", label: "Albers Industrials", icon: Factory, color: "text-amber-600" },
  { id: "advanced_programs", label: "Albers Advanced Programs", icon: Sparkles, color: "text-purple-600" },
];

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export default function NewsArchivePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  const { data: articles = [], isLoading } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news", "archive", "all"],
    queryFn: async () => {
      const response = await fetch(`/api/news?includeArchived=true`);
      if (!response.ok) throw new Error("Failed to fetch articles");
      return response.json();
    },
  });

  const filterBySearch = (article: NewsArticle) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      article.title.toLowerCase().includes(query) ||
      (article.summary && article.summary.toLowerCase().includes(query)) ||
      (article.content && article.content.toLowerCase().includes(query))
    );
  };

  const getArticlesForDivision = (divisionId: string) => {
    return articles
      .filter(article => article.division === divisionId && filterBySearch(article))
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative h-40 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#51142a]/90 via-[#51142a]/80 to-[#0E2841]/70" />
        <div className="relative z-10 h-full flex items-center px-6 md:px-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm">
              <Newspaper className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">All News Bulletins</h1>
              <p className="text-white/80">
                Browse all news articles across divisions
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-articles"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {divisions.map((division) => {
            const divisionArticles = getArticlesForDivision(division.id);
            const DivisionIcon = division.icon;
            
            return (
              <div key={division.id} className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <DivisionIcon className={`w-5 h-5 ${division.color}`} />
                  <h2 className="font-semibold text-sm">{division.label}</h2>
                  <Badge variant="outline" className="ml-auto text-xs bg-background">
                    {divisionArticles.length}
                  </Badge>
                </div>
                
                {divisionArticles.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No bulletins
                  </div>
                ) : (
                  <div className="space-y-2">
                    {divisionArticles.map((article) => (
                      <Card
                        key={article.id}
                        className="hover-elevate cursor-pointer"
                        onClick={() => setSelectedArticle(article)}
                        data-testid={`card-archive-article-${article.id}`}
                        data-goatcounter-click={`division-news-view-article-${article.id}`}
                        data-goatcounter-title={`View News Article: ${article.title}`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-1.5 mb-1">
                            {article.isPinned && (
                              <Pin className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                            )}
                            <h3 className="font-medium text-sm line-clamp-2 leading-tight">
                              {article.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                            <Calendar className="w-3 h-3" />
                            {safeFormatDate(article.publishedAt, "MMM d, yyyy")}
                          </div>
                          <div 
                            className="text-xs text-muted-foreground bulletin-content"
                            dangerouslySetInnerHTML={{ __html: article.content }}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        {selectedArticle && (
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">
                  {divisions.find(d => d.id === selectedArticle.division)?.label || selectedArticle.division}
                </Badge>
                {selectedArticle.isPinned && (
                  <Badge variant="secondary" className="gap-1">
                    <Pin className="w-3 h-3" />
                    Pinned
                  </Badge>
                )}
                {selectedArticle.isArchived && (
                  <Badge variant="secondary">Archived</Badge>
                )}
              </div>
              <DialogTitle className="text-xl">{selectedArticle.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Published on {safeFormatDate(selectedArticle.publishedAt, "MMMM d, yyyy 'at' h:mm a")}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div 
                className="bulletin-content max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
              />
              {selectedArticle.attachmentUrl && (
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedArticle.attachmentUrl!, '_blank', 'noopener,noreferrer')}
                    className="gap-2"
                    data-testid="button-view-archive-attachment"
                    data-goatcounter-click={`division-news-view-attachment-${selectedArticle.id}`}
                    data-goatcounter-title="View News Attachment"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Attachment: {selectedArticle.attachmentName || 'Document'}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
      </div>
    </div>
  );
}
