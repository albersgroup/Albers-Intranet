import { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
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
  Wrench,
  FolderOpen,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { FEATURES } from "@/config/features";

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
  { id: "home", title: "Home", description: "Corporate home page", url: "/", icon: Home, category: "Navigation", keywords: ["main", "dashboard", "start", "welcome", "landing"] },
  { id: "news-archive", title: "All News Bulletins", description: "Browse all news articles", url: "/news-archive", icon: Archive, category: "Navigation", keywords: ["articles", "updates", "announcements", "bulletin", "news", "archive", "archived", "all"] },
  { id: "sops", title: "SOPs & Processes", description: "Standard Operating Procedures library", url: "/sops", icon: BookOpen, category: "Navigation", keywords: ["procedures", "documents", "policies", "guides", "sop", "standard", "operating"] },
  { id: "albers-bot", title: "Albers Bot", description: "AI assistant for help and guidance", url: "/albers-bot", icon: Bot, category: "Navigation", keywords: ["ai", "help", "assistant", "chat", "bot", "question", "ask"] },
  { id: "tools-resources", title: "Tools & Resources", description: "Templates, guides, and employee resources", url: "/tools-resources", icon: Wrench, category: "Navigation", keywords: ["tools", "resources", "templates", "guides", "downloads", "files", "documents", "forms", "utilities", "links", "employee"] },
  
  { id: "new-opportunity", title: "New Opportunity Form", description: "Submit a new business opportunity", url: "/new-opportunity", icon: FilePlus2, category: "Business Development", keywords: ["opportunity", "form", "submit", "crm", "new", "business", "lead"] },
  { id: "bid-no-bid", title: "Bid / No-Bid", description: "Opportunity evaluation tool", url: "/bid-no-bid", icon: ClipboardCheck, category: "Business Development", keywords: ["decision", "evaluate", "bid", "no-bid", "assessment", "go", "no-go"] },
  { id: "capture-questions", title: "Capture Questions", description: "42 questions for opportunity preparation", url: "/capture-questions", icon: FileText, category: "Business Development", keywords: ["questions", "capture", "preparation", "analysis", "intel", "solution", "42"] },
  { id: "training", title: "Training", description: "Training materials and resources", url: "/training", icon: Presentation, category: "Business Development", keywords: ["training", "proposal", "writing", "slides", "presentation", "learn", "best practices", "learning"] },
  { id: "proposal-dashboard", title: "Proposal Dashboard", description: "Track proposal status and pipeline", url: "/proposal-dashboard", icon: FolderOpen, category: "Business Development", keywords: ["clickup", "dashboard", "proposals", "pipeline", "tracking", "status", "progress"] },
  
  { id: "bi-reports", title: "Business Intelligence Tool", description: "Business Intelligence reports", externalUrl: "/api/easy-bi-reports", icon: BarChart3, category: "Business Tools", keywords: ["analytics", "reports", "data", "bi", "business intelligence"] },
  { id: "govdash", title: "GovDash", description: "Government dashboard", externalUrl: "https://dashboard.govdash.com/login", icon: LayoutDashboard, category: "Business Tools", keywords: ["government", "dashboard", "contracts", "gov"] },
  { id: "clickup", title: "ClickUp", description: "Project management", externalUrl: "https://app.clickup.com/login", icon: CheckSquare, category: "Business Tools", keywords: ["tasks", "projects", "management", "clickup", "pm"] },
  { id: "salesforce", title: "Salesforce", description: "CRM platform", externalUrl: "https://albers.my.salesforce.com/", icon: ExternalLink, category: "Business Tools", keywords: ["crm", "sales", "customers", "salesforce", "sf"] },
  
  { id: "unanet", title: "Unanet (Timekeeping)", description: "Time tracking and reporting", externalUrl: "https://albers-aero.unanet.biz/albers-aero/action/login", icon: Calendar, category: "Finance & HR", keywords: ["time", "timekeeping", "hours", "timesheets", "unanet", "clock"] },
  { id: "rippling", title: "Rippling (HR & Payroll)", description: "HR and payroll management", externalUrl: "https://app.rippling.com/", icon: Users, category: "Finance & HR", keywords: ["hr", "payroll", "benefits", "pay", "rippling", "human resources", "salary"] },
  { id: "401k", title: "401k / Retirement", description: "Retirement planning", externalUrl: "https://www.principal.com/", icon: DollarSign, category: "Finance & HR", keywords: ["retirement", "401k", "savings", "pension", "principal"] },
  { id: "healthcare", title: "Healthcare Portal", description: "Health insurance portal", externalUrl: "https://www.anthem.com/", icon: Heart, category: "Finance & HR", keywords: ["health", "insurance", "medical", "benefits", "anthem", "doctor", "healthcare"] },
  
  { id: "defense-home", title: "Albers Defense", description: "Defense division portal", url: "/defense", icon: Shield, category: "Divisions", keywords: ["defense", "military", "dod", "department"] },
  { id: "industrials-home", title: "Albers Industrials", description: "Industrial division portal", url: "/industrials", icon: Factory, category: "Divisions", keywords: ["industrial", "manufacturing", "commercial"] },
  { id: "advanced-home", title: "Albers Advanced Programs", description: "Advanced programs division portal", url: "/special-projects", icon: Sparkles, category: "Divisions", keywords: ["advanced", "programs", "technology", "special", "projects"] },
];

const adminItems: SearchResult[] = [
  { id: "admin-control-panel", title: "Control Panel", description: "User management and administration", url: "/admin", icon: Users, category: "Administration", keywords: ["admin", "control", "panel", "users", "roles", "permissions", "manage"] },
  { id: "admin-bulletins", title: "Manage Bulletins", description: "Create and edit bulletins", url: "/admin/news", icon: Newspaper, category: "Administration", keywords: ["admin", "news", "manage", "articles", "bulletin", "bulletins", "create", "edit"] },
  { id: "admin-newsletters", title: "Manage Newsletters", description: "Upload and manage newsletters", url: "/admin/newsletters", icon: FileText, category: "Administration", keywords: ["admin", "newsletters", "upload", "pdf"] },
  { id: "admin-corporate", title: "Corporate Admin", description: "Manage Corporate division content", url: "/admin/division/corporate", icon: Building2, category: "Administration", keywords: ["admin", "corporate", "division", "content", "manage"] },
  { id: "admin-defense", title: "Defense Admin", description: "Manage Defense division content", url: "/admin/division/defense", icon: Shield, category: "Administration", keywords: ["admin", "defense", "division", "content", "manage"] },
  { id: "admin-industrials", title: "Industrials Admin", description: "Manage Industrials division content", url: "/admin/division/industrials", icon: Factory, category: "Administration", keywords: ["admin", "industrials", "division", "content", "manage"] },
  { id: "admin-advanced", title: "Advanced Programs Admin", description: "Manage Advanced Programs division content", url: "/admin/division/special-projects", icon: Sparkles, category: "Administration", keywords: ["admin", "advanced", "programs", "special", "projects", "division", "content", "manage"] },
];

export interface CommandPaletteHandle {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

interface CommandPaletteProps {
  onAskAlbersBot?: (query: string) => void;
}

const CommandPalette = forwardRef<CommandPaletteHandle, CommandPaletteProps>(
  ({ onAskAlbersBot }, ref) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [newsResults, setNewsResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [, setLocation] = useLocation();
    const { user } = useAuth();

    useImperativeHandle(ref, () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen((prev) => !prev),
    }));


    const searchNews = useCallback(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setNewsResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          const results: SearchResult[] = data.news?.map((article: any) => ({
            id: `news-${article.id}`,
            title: article.title,
            description: article.summary?.substring(0, 100) + "...",
            url: "/news-archive",
            icon: Newspaper,
            category: "News Articles",
          })) || [];
          setNewsResults(results);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, []);

    useEffect(() => {
      const debounce = setTimeout(() => {
        if (open) {
          searchNews(query);
        }
      }, 300);
      return () => clearTimeout(debounce);
    }, [query, searchNews, open]);

    const handleSelect = (item: SearchResult) => {
      if (item.externalUrl) {
        window.open(item.externalUrl, "_blank");
      } else if (item.url) {
        setLocation(item.url);
      }
      setOpen(false);
      setQuery("");
    };

    const handleAskAlbersBot = () => {
      if (query.trim()) {
        if (onAskAlbersBot) {
          onAskAlbersBot(query);
        } else {
          setLocation(`/albers-bot?q=${encodeURIComponent(query)}`);
        }
      } else {
        setLocation("/albers-bot");
      }
      setOpen(false);
      setQuery("");
    };

    // Filter out disabled features
    const enabledNavigationItems = navigationItems.filter(item => {
      if (item.id === "albers-bot") return FEATURES.ALBERS_BOT;
      if (item.id === "proposal-dashboard") return FEATURES.CLICKUP_INTEGRATION;
      if (item.id === "bi-reports") return FEATURES.SSO_BI_TOOL;
      if (item.id === "clickup") return FEATURES.CLICKUP_INTEGRATION;
      return true;
    });

    const allItems = user?.role === "admin"
      ? [...enabledNavigationItems, ...adminItems]
      : enabledNavigationItems;

    const filteredItems = query
      ? allItems.filter(item => {
          const searchLower = query.toLowerCase();
          return (
            item.title.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower) ||
            item.keywords?.some(k => k.toLowerCase().includes(searchLower))
          );
        })
      : allItems;

    const groupedItems = filteredItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, SearchResult[]>);

    return (
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={FEATURES.ALBERS_BOT ? "Search pages, tools, news... or ask Albers Bot" : "Search pages, tools, news..."}
          value={query}
          onValueChange={setQuery}
          data-testid="input-command-search"
        />
        <CommandList>
          <CommandEmpty>
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">No results found for "{query}"</p>
              {FEATURES.ALBERS_BOT && (
                <button
                  onClick={handleAskAlbersBot}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover-elevate"
                  data-testid="button-ask-albers-bot-empty"
                  data-goatcounter-click="command-ask-bot-empty"
                  data-goatcounter-title="Command Palette Ask Bot (No Results)"
                >
                  <Bot className="w-4 h-4" />
                  Ask Albers Bot
                </button>
              )}
            </div>
          </CommandEmpty>

          {FEATURES.ALBERS_BOT && query.length > 0 && (
            <>
              <CommandGroup heading="Ask AI">
                <CommandItem
                  onSelect={handleAskAlbersBot}
                  className="flex items-center gap-3 py-3"
                  data-testid="command-ask-albers-bot"
                  data-goatcounter-click="command-ask-bot"
                  data-goatcounter-title="Command Palette Ask Albers Bot"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Ask Albers Bot: "{query}"</p>
                    <p className="text-xs text-muted-foreground">Get AI-powered help and guidance</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">AI</Badge>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {newsResults.length > 0 && (
            <>
              <CommandGroup heading="News Articles">
                {newsResults.slice(0, 3).map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.id}
                      onSelect={() => handleSelect(item)}
                      className="flex items-center gap-3"
                      data-testid={`command-${item.id}`}
                      data-goatcounter-click={`command-${item.id}`}
                      data-goatcounter-title={`Command: ${item.title}`}
                    >
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {Object.entries(groupedItems).map(([category, items]) => (
            <CommandGroup key={category} heading={category}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3"
                    data-testid={`command-${item.id}`}
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate">{item.title}</p>
                        {item.externalUrl && (
                          <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
        
        <div className="border-t p-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">esc</kbd>
              close
            </span>
          </div>
          {FEATURES.ALBERS_BOT && (
            <span className="flex items-center gap-1">
              <Search className="w-3 h-3" />
              Powered by Albers Bot
            </span>
          )}
        </div>
      </CommandDialog>
    );
  }
);

CommandPalette.displayName = "CommandPalette";

export default CommandPalette;
