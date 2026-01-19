import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2,
  Shield,
  Factory,
  Sparkles,
  Home,
  BookOpen,
  Presentation,
  BarChart3,
  ClipboardCheck,
  FilePlus2,
  FileText,
  Bot,
  ExternalLink,
  Newspaper,
  Archive,
  Search,
  Calendar,
  Users,
  DollarSign,
  Heart,
  LayoutDashboard,
  CheckSquare,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  url?: string;
  externalUrl?: string;
  icon: React.ElementType;
  category: string;
  keywords?: string[];
}

const navigationItems: SearchResult[] = [
  { id: "home", title: "Home", description: "Corporate home page", url: "/", icon: Home, category: "Navigation", keywords: ["main", "dashboard", "start"] },
  { id: "news-archive", title: "All News Bulletins", description: "Browse all news articles", url: "/news-archive", icon: Archive, category: "Navigation", keywords: ["articles", "updates", "announcements", "bulletin", "archive", "archived", "all", "news"] },
  { id: "sops", title: "SOPs & Processes", description: "Standard Operating Procedures library", url: "/sops", icon: BookOpen, category: "Navigation", keywords: ["procedures", "documents", "policies", "guides"] },
  { id: "albers-bot", title: "Albers Bot", description: "AI assistant for help and guidance", url: "/albers-bot", icon: Bot, category: "Navigation", keywords: ["ai", "help", "assistant", "chat"] },
  
  { id: "new-opportunity", title: "New Opportunity Form", description: "Submit a new business opportunity", url: "/new-opportunity", icon: FilePlus2, category: "Business Development", keywords: ["opportunity", "form", "submit", "crm"] },
  { id: "bid-no-bid", title: "Bid / No-Bid", description: "Opportunity evaluation tool", url: "/bid-no-bid", icon: ClipboardCheck, category: "Business Development", keywords: ["decision", "evaluate", "bid"] },
  { id: "capture-questions", title: "Capture Questions", description: "42 questions for opportunity preparation", url: "/capture-questions", icon: FileText, category: "Business Development", keywords: ["questions", "capture", "preparation"] },
  { id: "trip-reports", title: "Trip Reports", description: "Post-event forms for conferences and business travel", url: "/trip-reports", icon: FileText, category: "Business Development", keywords: ["trip", "travel", "event", "conference", "report", "post-event"] },
  { id: "training", title: "Training", description: "Training materials and resources", url: "/training", icon: Presentation, category: "Business Development", keywords: ["training", "proposal", "writing", "learning"] },
  
  { id: "bi-reports", title: "Business Intelligence Tool", description: "Business Intelligence reports", externalUrl: "/api/easy-bi-reports", icon: BarChart3, category: "Business Tools", keywords: ["analytics", "reports", "data"] },
  { id: "govdash", title: "GovDash", description: "Government dashboard", externalUrl: "https://dashboard.govdash.com/login", icon: LayoutDashboard, category: "Business Tools", keywords: ["government", "dashboard"] },
  { id: "clickup", title: "ClickUp", description: "Project management", externalUrl: "https://app.clickup.com/login", icon: CheckSquare, category: "Business Tools", keywords: ["tasks", "projects", "management"] },
  { id: "salesforce", title: "Salesforce", description: "CRM platform", externalUrl: "https://albers.my.salesforce.com/", icon: ExternalLink, category: "Business Tools", keywords: ["crm", "sales", "customers"] },
  
  { id: "unanet", title: "Unanet (Timekeeping)", description: "Time tracking and reporting", externalUrl: "https://albers-aero.unanet.biz/albers-aero/action/login", icon: Calendar, category: "Finance & HR", keywords: ["time", "timekeeping", "hours", "timesheets"] },
  { id: "rippling", title: "Rippling (HR & Payroll)", description: "HR and payroll management", externalUrl: "https://app.rippling.com/", icon: Users, category: "Finance & HR", keywords: ["hr", "payroll", "benefits", "pay"] },
  { id: "401k", title: "401k / Retirement", description: "Retirement planning", externalUrl: "https://www.principal.com/", icon: DollarSign, category: "Finance & HR", keywords: ["retirement", "401k", "savings"] },
  { id: "healthcare", title: "Healthcare Portal", description: "Health insurance portal", externalUrl: "https://www.anthem.com/", icon: Heart, category: "Finance & HR", keywords: ["health", "insurance", "medical", "benefits"] },
  
  { id: "defense-home", title: "Albers Defense", description: "Defense division portal", url: "/defense", icon: Shield, category: "Divisions", keywords: ["defense", "military"] },
  { id: "industrials-home", title: "Albers Industrials", description: "Industrial division portal", url: "/industrials", icon: Factory, category: "Divisions", keywords: ["industrial", "manufacturing"] },
  { id: "advanced-home", title: "Albers Advanced Programs", description: "Advanced programs division portal", url: "/special-projects", icon: Sparkles, category: "Divisions", keywords: ["advanced", "programs", "technology"] },
];

const adminItems: SearchResult[] = [
  { id: "admin-bulletins", title: "Manage Bulletins", description: "Create and edit bulletins", url: "/admin/news", icon: Newspaper, category: "Administration", keywords: ["admin", "news", "bulletins", "manage"] },
  { id: "admin-newsletters", title: "Manage Newsletters", description: "Upload and manage newsletters", url: "/admin/newsletters", icon: FileText, category: "Administration", keywords: ["admin", "newsletters", "upload"] },
];

export default function InlineSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [newsResults, setNewsResults] = useState<SearchResult[]>([]);
  const [sopResults, setSopResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.email?.endsWith("@albers.aero") || user?.email?.endsWith("@albersaerospace.com");

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search news
  const searchNews = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setNewsResults([]);
      return;
    }
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        const results: SearchResult[] = data.news?.map((article: any) => ({
          id: `news-${article.id}`,
          title: article.title,
          description: article.summary?.substring(0, 80) + "...",
          url: "/news-archive",
          icon: Newspaper,
          category: "News Articles",
        })) || [];
        setNewsResults(results);
      }
    } catch (error) {
      console.error("Search error:", error);
    }
  }, []);

  // Search SOPs
  const searchSOPs = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSopResults([]);
      return;
    }
    try {
      const response = await fetch("/api/sop-context");
      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          setSopResults([]);
          return;
        }
        const data = await response.json();
        const queryWords = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const matchedSOPs = data.sops?.filter((sop: any) => {
          const searchText = `${sop.title || ''} ${sop.category || ''}`.toLowerCase();
          return queryWords.every(word => searchText.includes(word));
        }).slice(0, 5).map((sop: any) => ({
          id: `sop-${sop.title}`,
          title: sop.title,
          description: sop.category,
          url: "/sops",
          icon: BookOpen,
          category: "SOPs & Processes",
        })) || [];
        setSopResults(matchedSOPs);
      }
    } catch (error) {
      setSopResults([]);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query.length >= 2) {
        searchNews(query);
        searchSOPs(query);
      } else {
        setNewsResults([]);
        setSopResults([]);
      }
    }, 200);
    return () => clearTimeout(debounce);
  }, [query, searchNews, searchSOPs]);

  // Helper function to check if all query words are found in text
  const matchesQuery = (text: string, queryWords: string[]): boolean => {
    const lowerText = text.toLowerCase();
    return queryWords.every(word => lowerText.includes(word));
  };

  // Filter navigation items - match all query words
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  
  const filteredNav = query.length >= 1 
    ? navigationItems.filter(item => {
        const searchText = `${item.title} ${item.description || ''} ${item.keywords?.join(' ') || ''}`;
        return matchesQuery(searchText, queryWords);
      })
    : [];

  const filteredAdmin = isAdmin && query.length >= 1
    ? adminItems.filter(item => {
        const searchText = `${item.title} ${item.description || ''} ${item.keywords?.join(' ') || ''}`;
        return matchesQuery(searchText, queryWords);
      })
    : [];

  // All results flattened for keyboard navigation
  const allResults = [
    ...filteredNav,
    ...filteredAdmin,
    ...newsResults,
    ...sopResults,
  ];

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (item: SearchResult) => {
    if (item.externalUrl) {
      window.open(item.externalUrl, "_blank");
    } else if (item.url) {
      setLocation(item.url);
    }
    setQuery("");
    setIsOpen(false);
  };

  const handleAskAlbersBot = () => {
    if (query.trim()) {
      setLocation(`/albers-bot?q=${encodeURIComponent(query)}`);
    } else {
      setLocation("/albers-bot");
    }
    setQuery("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setSelectedIndex(prev => Math.min(prev + 1, allResults.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // If there are results and first one is selected, navigate to it
      if (allResults.length > 0 && selectedIndex < allResults.length) {
        handleSelect(allResults[selectedIndex]);
      } else if (selectedIndex === allResults.length && allResults.length > 0) {
        // "Ask Albers Bot" is selected (last option after results)
        handleAskAlbersBot();
      } else if (query.trim()) {
        // No results, go to Albers Bot with query
        handleAskAlbersBot();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = isOpen && (query.length >= 1 || allResults.length > 0);

  // Group results by category
  const groupedResults: Record<string, SearchResult[]> = {};
  allResults.forEach(item => {
    if (!groupedResults[item.category]) {
      groupedResults[item.category] = [];
    }
    groupedResults[item.category].push(item);
  });

  let flatIndex = 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search or Ask Albers Bot..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 h-10 bg-background"
          data-testid="input-search"
        />
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
          <ScrollArea className="max-h-80">
            {Object.entries(groupedResults).map(([category, items]) => (
              <div key={category}>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                  {category}
                </div>
                {items.map((item) => {
                  const currentIndex = flatIndex++;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover-elevate ${
                        selectedIndex === currentIndex ? "bg-accent" : ""
                      }`}
                      data-testid={`search-result-${item.id}`}
                    >
                      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.title}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                        )}
                      </div>
                      {item.externalUrl && (
                        <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Ask Albers Bot option */}
            <div className="border-t border-border">
              <button
                onClick={handleAskAlbersBot}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover-elevate ${
                  selectedIndex === allResults.length ? "bg-accent" : ""
                }`}
                data-testid="search-ask-albers-bot"
              >
                <Bot className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {query.trim() ? `Ask Albers Bot: "${query}"` : "Ask Albers Bot"}
                  </div>
                  <div className="text-xs text-muted-foreground">Get AI-powered help</div>
                </div>
              </button>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
