import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  ArrowRight, 
  BarChart3,
  ExternalLink,
  FileText,
  Target,
  TrendingUp,
  ClipboardCheck,
  FilePlus2,
  Link as LinkIcon,
  Briefcase,
  Newspaper,
  Plane,
  Building2,
  LayoutDashboard,
  CheckSquare,
  type LucideIcon
} from "lucide-react";
import LatestNews from "@/components/LatestNews";
import NewsletterPreview from "@/components/NewsletterPreview";
import InlineSearch from "@/components/InlineSearch";
import heroImage from "@assets/stock_images/us_military_fighter__d5b397c4.jpg";

interface QuickLink {
  id: string;
  link_type: "internal" | "external";
  title: string;
  description: string;
  icon: string;
  url: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Link: LinkIcon,
  ExternalLink: ExternalLink,
  LayoutDashboard: LayoutDashboard,
  FileText: FileText,
  BarChart3: BarChart3,
  CheckSquare: CheckSquare,
  Target: Target,
  TrendingUp: TrendingUp,
  ClipboardCheck: ClipboardCheck,
  FilePlus2: FilePlus2,
  Briefcase: Briefcase,
  Building2: Building2,
  Newspaper: Newspaper,
  Plane: Plane
};

const ICON_COLORS = [
  "text-blue-600",
  "text-emerald-600",
  "text-purple-600",
  "text-amber-600",
  "text-rose-600",
  "text-cyan-600"
];

const INTERNAL_LINKS: QuickLink[] = [
  { id: "1", link_type: "internal", title: "IDIQ Management Portal", description: "AI-scored task order opportunities", icon: "Target", url: "/idiq-management" },
  { id: "2", link_type: "internal", title: "New Opportunity Form", description: "Submit new business opportunities", icon: "FilePlus2", url: "/new-opportunity" },
  { id: "3", link_type: "internal", title: "Bid / No-Bid", description: "Opportunity evaluation tool", icon: "ClipboardCheck", url: "/bid-no-bid" },
  { id: "4", link_type: "internal", title: "Capture Questions", description: "Strategic capture guidance", icon: "FileText", url: "/capture-questions" },
  { id: "5", link_type: "internal", title: "Trip Reports", description: "Customer visit documentation", icon: "Plane", url: "/trip-reports" },
];

const EXTERNAL_LINKS: QuickLink[] = [
  { id: "7", link_type: "external", title: "GovDash", description: "Government dashboard", icon: "LayoutDashboard", url: "https://dashboard.govdash.com/login" },
  { id: "8", link_type: "external", title: "Salesforce", description: "CRM & pipeline management", icon: "Target", url: "https://albers.my.salesforce.com/" },
  { id: "9", link_type: "external", title: "ClickUp", description: "Project management", icon: "CheckSquare", url: "https://app.clickup.com/login" },
];

function HeroSection() {
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
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#51142a] animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-white/20 text-white border-white/30 text-xs font-medium">
                Business Development
              </Badge>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
              Business Development Hub
            </h1>
            <p className="text-lg text-white/80">
              Capture Management & Growth Operations
            </p>
          </div>
        </div>
        
        <p className="text-white/70 mb-6 leading-relaxed">
          Your central hub for business development, capture management, and opportunity tracking. 
          Access AI-powered opportunity scoring, trip reports, bid decisions, and pipeline analytics.
        </p>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20">
          <InlineSearch />
        </div>
        
        <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
            <span className="text-white/60 text-sm">Capture Operations</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-white/60" />
            <span className="text-white/60 text-sm">Pipeline Growth</span>
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

function IDIQCTASection() {
  return (
    <Link href="/idiq-management">
      <Card className="hover-elevate cursor-pointer border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">IDIQ Management Portal</h3>
                <p className="text-sm text-muted-foreground">AI-scored task order opportunities filtered by Albers capabilities</p>
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
    <LatestNews division="corporate" limit={5} title="BD News & Updates" />
  );
}

function NewsletterSection() {
  return (
    <NewsletterPreview division="corporate" />
  );
}

function BDToolsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          BD Tools
        </CardTitle>
        <CardDescription>
          Business development and capture resources
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {INTERNAL_LINKS.map((link, index) => {
          const Icon = ICON_MAP[link.icon] || LinkIcon;
          const color = ICON_COLORS[index % ICON_COLORS.length];
          return (
            <Link key={link.id} href={link.url}>
              <Card className="hover-elevate cursor-pointer" data-testid={`bd-tool-${link.url.slice(1)}`}>
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

function ExternalSystemsSection() {
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
        {EXTERNAL_LINKS.map((link, index) => {
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

export default function BusinessDevelopmentHome() {
  return (
    <div className="p-6 pb-24 max-w-7xl mx-auto space-y-6">
      <HeroSection />
      <IDIQCTASection />
      <div className="grid lg:grid-cols-2 gap-6">
        <NewsSection />
        <NewsletterSection />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <BDToolsSection />
        <ExternalSystemsSection />
      </div>
    </div>
  );
}
