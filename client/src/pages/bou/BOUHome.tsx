import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  Presentation, 
  ArrowRight, 
  LayoutDashboard,
  BarChart3,
  CheckSquare,
  ExternalLink,
  FileText,
  Target,
  TrendingUp,
  ClipboardCheck,
  FilePlus2,
  Link as LinkIcon,
  Settings,
  Briefcase,
  Building2,
  Users,
  type LucideIcon
} from "lucide-react";
import LatestNews from "@/components/LatestNews";
import NewsletterPreview from "@/components/NewsletterPreview";
import InlineSearch from "@/components/InlineSearch";
import BOUBulletinBoard from "@/components/BOUBulletinBoard";
import fallbackHeroImage from "@assets/BOU2_1765817054697.png";

interface QuickLink {
  id: string;
  link_type: "internal" | "external";
  title: string;
  description: string;
  icon: string;
  url: string;
  sort_order: number;
  is_visible: boolean;
}

interface HeroAsset {
  id: string;
  file_url: string;
  file_name: string;
  alt_text: string;
  is_active: boolean;
}

interface LayoutSection {
  id: string;
  section_key: string;
  display_name: string;
  sort_order: number;
  column_span: number;
  is_visible: boolean;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Link: LinkIcon,
  ExternalLink: ExternalLink,
  LayoutDashboard: LayoutDashboard,
  Presentation: Presentation,
  FileText: FileText,
  BarChart3: BarChart3,
  CheckSquare: CheckSquare,
  Target: Target,
  TrendingUp: TrendingUp,
  Users: Users,
  ClipboardCheck: ClipboardCheck,
  FilePlus2: FilePlus2,
  Settings: Settings,
  Briefcase: Briefcase,
  Building2: Building2
};

const ICON_COLORS = [
  "text-blue-600",
  "text-emerald-600",
  "text-purple-600",
  "text-amber-600",
  "text-rose-600",
  "text-cyan-600"
];

const DEFAULT_INTERNAL_LINKS: QuickLink[] = [
  { id: "1", link_type: "internal", title: "Proposal Dashboard", description: "Live ClickUp metrics & analytics", icon: "LayoutDashboard", url: "/proposal-dashboard", sort_order: 0, is_visible: true },
  { id: "2", link_type: "internal", title: "Training", description: "Best practices & templates", icon: "Presentation", url: "/training", sort_order: 1, is_visible: true },
  { id: "3", link_type: "internal", title: "New Opportunity Form", description: "Submit new business opportunities", icon: "FilePlus2", url: "/new-opportunity", sort_order: 2, is_visible: true },
  { id: "4", link_type: "internal", title: "Capture Questions", description: "Strategic capture guidance", icon: "FileText", url: "/capture-questions", sort_order: 3, is_visible: true }
];

const DEFAULT_EXTERNAL_LINKS: QuickLink[] = [
  { id: "5", link_type: "external", title: "Business Intelligence Tool", description: "Business intelligence reports", icon: "BarChart3", url: "/api/easy-bi-reports", sort_order: 0, is_visible: true },
  { id: "6", link_type: "external", title: "GovDash", description: "Government dashboard", icon: "LayoutDashboard", url: "https://dashboard.govdash.com/login", sort_order: 1, is_visible: true },
  { id: "7", link_type: "external", title: "ClickUp", description: "Project management", icon: "CheckSquare", url: "https://app.clickup.com/login", sort_order: 2, is_visible: true },
  { id: "8", link_type: "external", title: "Salesforce", description: "CRM & pipeline management", icon: "Target", url: "https://albers.my.salesforce.com/", sort_order: 3, is_visible: true }
];

const DEFAULT_LAYOUT: LayoutSection[] = [
  { id: "1", section_key: "hero", display_name: "Hero Banner", sort_order: 0, column_span: 2, is_visible: true },
  { id: "2", section_key: "dashboard_cta", display_name: "Proposal Dashboard CTA", sort_order: 1, column_span: 2, is_visible: true },
  { id: "3", section_key: "news", display_name: "BOU News & Updates", sort_order: 2, column_span: 1, is_visible: true },
  { id: "4", section_key: "newsletter", display_name: "BOU Newsletter", sort_order: 3, column_span: 1, is_visible: true },
  { id: "5", section_key: "bulletin", display_name: "Bulletin Board", sort_order: 4, column_span: 1, is_visible: true },
  { id: "6", section_key: "bou_tools", display_name: "BOU Tools", sort_order: 5, column_span: 1, is_visible: true },
  { id: "7", section_key: "external_systems", display_name: "External Systems", sort_order: 6, column_span: 1, is_visible: true },
];

function HeroSection({ heroImage }: { heroImage: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg shadow-lg">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#51142a]/75 via-[#3d1020]/70 to-[#0E2841]/70" />
      
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
      <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-white/20 rounded-full animate-pulse" />
      <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white/15 rounded-full animate-pulse delay-300" />
      <div className="absolute bottom-1/3 right-1/2 w-1 h-1 bg-white/10 rounded-full animate-pulse delay-700" />
      
      <div className="relative z-10 p-8">
        <div className="flex items-start gap-5 mb-6">
          <div className="relative">
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
              <Presentation className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#51142a] animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-white/20 text-white border-white/30 text-xs font-medium">
                Business Operations
              </Badge>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
              Business Operations Unit
            </h1>
            <p className="text-lg text-white/80">
              Proposal Management & Business Development Hub
            </p>
          </div>
        </div>
        
        <p className="text-white/70 mb-6 leading-relaxed">
          Your central hub for proposal management, business development tools, and capture operations. 
          Track proposal metrics, access training resources, and manage the full BD lifecycle.
        </p>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20">
          <InlineSearch />
        </div>
        
        <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
            <span className="text-white/60 text-sm">Proposal Operations</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-white/60" />
            <span className="text-white/60 text-sm">Business Development</span>
          </div>
          <Link href="/">
            <div className="flex items-center gap-2 hover:text-white/80 cursor-pointer">
              <ArrowRight className="w-4 h-4 text-white/60" />
              <span className="text-white/60 text-sm">Go to Corporate Portal</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function DashboardCTASection() {
  return (
    <Link href="/proposal-dashboard">
      <Card className="hover-elevate cursor-pointer border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <LayoutDashboard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Proposal Dashboard</h3>
                <p className="text-sm text-muted-foreground">View live ClickUp metrics, win rates, and team workload</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function NewsSection() {
  return (
    <LatestNews division="bou" limit={5} title="BOU News & Updates" />
  );
}

function NewsletterSection() {
  return (
    <NewsletterPreview division="bou" />
  );
}

function BulletinSection() {
  return <BOUBulletinBoard />;
}

function BOUToolsSection({ internalLinks }: { internalLinks: QuickLink[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          BOU Tools
        </CardTitle>
        <CardDescription>
          Proposal and capture management resources
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {internalLinks.map((link, index) => {
          const Icon = ICON_MAP[link.icon] || LinkIcon;
          const color = ICON_COLORS[index % ICON_COLORS.length];
          return (
            <Link key={link.id} href={link.url}>
              <Card className="hover-elevate cursor-pointer" data-testid={`bou-tool-${link.url.slice(1)}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm">{link.title}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {link.description}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ExternalSystemsSection({ externalLinks }: { externalLinks: QuickLink[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-primary" />
          External Systems
        </CardTitle>
        <CardDescription>
          Quick access to external platforms
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {externalLinks.map((link, index) => {
          const Icon = ICON_MAP[link.icon] || ExternalLink;
          const color = ICON_COLORS[index % ICON_COLORS.length];
          return (
            <a 
              key={link.id} 
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              data-testid={`external-tool-${link.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Card className="hover-elevate cursor-pointer">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm">{link.title}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {link.description}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </a>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function BOUHome() {
  const { data: quickLinks = [] } = useQuery<QuickLink[]>({
    queryKey: ["/api/bou/quick-links"]
  });

  const { data: heroAsset } = useQuery<HeroAsset | null>({
    queryKey: ["/api/bou/hero-asset"]
  });

  const { data: layoutSections = [] } = useQuery<LayoutSection[]>({
    queryKey: ["/api/bou/home-layout"]
  });

  const internalLinks = quickLinks.length > 0 
    ? quickLinks.filter(l => l.link_type === "internal")
    : DEFAULT_INTERNAL_LINKS;

  const externalLinks = quickLinks.length > 0 
    ? quickLinks.filter(l => l.link_type === "external")
    : DEFAULT_EXTERNAL_LINKS;

  const heroImage = heroAsset?.file_url || fallbackHeroImage;

  // Use fetched layout or defaults
  const layout = layoutSections.length > 0 ? layoutSections : DEFAULT_LAYOUT;
  
  // Filter visible sections and sort by order
  const visibleSections = layout
    .filter(s => s.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Section registry - maps section_key to render function
  const sectionRegistry: Record<string, () => JSX.Element> = {
    hero: () => <HeroSection heroImage={heroImage} />,
    dashboard_cta: () => <DashboardCTASection />,
    news: () => <NewsSection />,
    newsletter: () => <NewsletterSection />,
    bulletin: () => <BulletinSection />,
    bou_tools: () => <BOUToolsSection internalLinks={internalLinks} />,
    external_systems: () => <ExternalSystemsSection externalLinks={externalLinks} />,
  };

  // Group sections into rows based on column spans
  const renderSections = () => {
    const rows: JSX.Element[] = [];
    let currentRow: LayoutSection[] = [];
    let currentRowSpan = 0;

    visibleSections.forEach((section, index) => {
      const sectionRenderer = sectionRegistry[section.section_key];
      if (!sectionRenderer) return;

      // Full-width sections get their own row
      if (section.column_span === 2) {
        // Flush current row first if any
        if (currentRow.length > 0) {
          rows.push(
            <div key={`row-${rows.length}`} className="grid lg:grid-cols-2 gap-6">
              {currentRow.map(s => (
                <div key={s.section_key}>
                  {sectionRegistry[s.section_key]?.()}
                </div>
              ))}
            </div>
          );
          currentRow = [];
          currentRowSpan = 0;
        }
        // Add full-width section
        rows.push(
          <div key={section.section_key}>
            {sectionRenderer()}
          </div>
        );
      } else {
        // Half-width sections
        currentRow.push(section);
        currentRowSpan += section.column_span;

        // If we have 2 columns worth, render the row
        if (currentRowSpan >= 2) {
          rows.push(
            <div key={`row-${rows.length}`} className="grid lg:grid-cols-2 gap-6">
              {currentRow.map(s => (
                <div key={s.section_key}>
                  {sectionRegistry[s.section_key]?.()}
                </div>
              ))}
            </div>
          );
          currentRow = [];
          currentRowSpan = 0;
        }
      }
    });

    // Flush remaining sections
    if (currentRow.length > 0) {
      rows.push(
        <div key={`row-${rows.length}`} className="grid lg:grid-cols-2 gap-6">
          {currentRow.map(s => (
            <div key={s.section_key}>
              {sectionRegistry[s.section_key]?.()}
            </div>
          ))}
        </div>
      );
    }

    return rows;
  };

  return (
    <div className="p-6 pb-24 max-w-7xl mx-auto space-y-6">
      {renderSections()}
    </div>
  );
}
