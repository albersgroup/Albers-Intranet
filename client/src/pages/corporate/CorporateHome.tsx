import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  Building2, 
  BookOpen, 
  FileText, 
  ClipboardCheck, 
  Presentation,
  ArrowRight,
  Users,
  DollarSign,
  Heart,
  ExternalLink,
  Briefcase,
  Trophy,
  Sparkles,
  Calendar,
  Star
} from "lucide-react";
import InlineSearch from "@/components/InlineSearch";
import NewsletterPreview from "@/components/NewsletterPreview";
import LatestNews from "@/components/LatestNews";
import EditableContentBlock from "@/components/EditableContentBlock";
import EditableTeamSpotlights from "@/components/EditableTeamSpotlights";
import LinkedInWidget from "@/components/LinkedInWidget";
import mariaPichowskyImg from "@assets/image_1764638378275.png";
import ryanFloodImg from "@assets/image_1764638470161.png";
import strategicPlanImg from "@assets/image_1764696373285.png";
import heroTeamImg from "@assets/Screenshot_2025-10-03_125626_1765409525214.png";

const employeeResources = [
  {
    title: "Unanet",
    description: "Time tracking & expense reporting",
    icon: Calendar,
    externalUrl: "https://albers-aero.unanet.biz/albers-aero/action/login",
    color: "text-blue-600"
  },
  {
    title: "Rippling",
    description: "HR, payroll & benefits portal",
    icon: Users,
    externalUrl: "https://app.rippling.com/",
    color: "text-emerald-600"
  },
  {
    title: "401k / Retirement",
    description: "Retirement savings & planning",
    icon: DollarSign,
    externalUrl: "https://www.principal.com/",
    color: "text-amber-600"
  },
  {
    title: "Healthcare Portal",
    description: "Benefits & insurance information",
    icon: Heart,
    externalUrl: "https://www.anthem.com/",
    color: "text-rose-600"
  }
];

const bdTools = [
  {
    title: "SOPs & Processes",
    description: "Standard operating procedures",
    icon: BookOpen,
    href: "/sops",
    color: "text-blue-600"
  },
  {
    title: "Bid / No-Bid",
    description: "Opportunity evaluation framework",
    icon: ClipboardCheck,
    href: "/bid-no-bid",
    color: "text-amber-600"
  },
  {
    title: "Capture Questions",
    description: "Strategic capture guidance",
    icon: FileText,
    href: "/capture-questions",
    color: "text-purple-600"
  }
];

const defaultTeamSpotlights = [
  {
    spotlightType: "New Hire" as const,
    name: "Maria Pichowsky",
    role: "Proposal Coordinator",
    department: "BOU",
    imageUrl: mariaPichowskyImg,
    imageName: "",
    context: "Joined Albers in March and has contributed significantly in Business Intelligence and Proposal Coordination."
  },
  {
    spotlightType: "Promotion" as const,
    name: "Ryan Flood",
    role: "Proposal Manager",
    department: "BOU",
    imageUrl: ryanFloodImg,
    imageName: "",
    context: "Promoted to Proposal Manager after leading several successful proposals in the BOU."
  },
  {
    spotlightType: "Achievement" as const,
    name: "Innovation Team",
    role: "Q4 Contract Win",
    department: "Albers Innovation",
    imageUrl: "",
    imageName: "",
    context: "Awarded Phase II of SBIR MOUS."
  }
];

export default function CorporateHome() {
  return (
    <div className="p-6 pb-24 max-w-7xl mx-auto space-y-6">
      {/* Hero Section - Premium Design with Team Image */}
      <div className="relative overflow-hidden rounded-lg shadow-lg">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroTeamImg})` }}
        />
        {/* Dark Gradient Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#51142a]/85 via-[#3d1020]/80 to-[#0E2841]/85" />
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
        <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-white/20 rounded-full animate-pulse" />
        <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white/15 rounded-full animate-pulse delay-300" />
        <div className="absolute bottom-1/3 right-1/2 w-1 h-1 bg-white/10 rounded-full animate-pulse delay-700" />
        
        {/* Content container with padding */}
        <div className="relative z-10 p-8">
          {/* Header with Icon Badge */}
          <div className="flex items-start gap-5 mb-6">
            <div className="relative">
              <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#51142a] animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-white/20 text-white border-white/30 text-xs font-medium">
                  Mission Ready
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Welcome to the Albers Aerospace Intranet
              </h1>
              <p className="text-lg text-white/80">
                Your single source of truth for tools, announcements, and resources
              </p>
            </div>
          </div>
          
          {/* Description */}
          <p className="text-white/70 mb-6 leading-relaxed">
            Find the information you need quickly—from employee resources and company announcements 
            to department-specific tools and templates. Spend less time searching and more time executing.
          </p>
          
          {/* Search Bar with Enhanced Styling */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20">
            <InlineSearch />
          </div>
          
          {/* Quick Stats Row */}
          <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              <span className="text-white/60 text-sm">All Systems Operational</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-white/60" />
              <span className="text-white/60 text-sm">4 Divisions</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-white/60" />
              <span className="text-white/60 text-sm">Ask Albers Bot for help</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: News Bulletin + Strategic Plan */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* News Bulletin - Corporate Articles Only */}
        <LatestNews division="corporate" limit={3} showArchiveLink={true} title="News Bulletin" />

        {/* Strategic Plan Section - Editable by Corporate Admin or System Admin */}
        <EditableContentBlock
          division="corporate"
          blockType="strategic_plan"
          defaultImage={strategicPlanImg}
          defaultTitle="2025-2027 Strategic Plan"
          defaultSubtitle="People First - Mission Always"
          defaultContent="Operating and executing at the speed of relevance. Our strategic priorities focus on innovation, excellence, dedication, and stewardship."
          defaultBadges={["Innovation", "Excellence", "Dedication", "Stewardship"]}
        />
      </div>

      {/* Newsletter Preview + LinkedIn Widget */}
      <div className="grid lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 flex">
          <NewsletterPreview division="corporate" />
        </div>
        <div className="flex">
          <LinkedInWidget />
        </div>
      </div>

      {/* Main Content Grid - 3 columns */}
      <div className="grid lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Column 1: Team Spotlights */}
        <div>
          <EditableTeamSpotlights 
            division="corporate"
            defaultSpotlights={defaultTeamSpotlights}
          />
        </div>

        {/* Column 2: Employee Resources */}
        <div>
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Employee Resources
              </CardTitle>
              <CardDescription>
                Quick access to HR, benefits, and administrative tools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {employeeResources.map((resource) => {
                const Icon = resource.icon;
                return (
                  <a 
                    key={resource.title} 
                    href={resource.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                    data-testid={`resource-${resource.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Card className="hover-elevate cursor-pointer">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-muted ${resource.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm">{resource.title}</h3>
                            <p className="text-xs text-muted-foreground truncate">
                              {resource.description}
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
        </div>

        {/* Column 3: BD & Proposals Tools */}
        <div>
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                BD & Proposals
              </CardTitle>
              <CardDescription>
                Business development tools and capture resources
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {bdTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link key={tool.href} href={tool.href}>
                    <Card className="hover-elevate cursor-pointer" data-testid={`bdtool-${tool.href.slice(1)}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-muted ${tool.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm">{tool.title}</h3>
                            <p className="text-xs text-muted-foreground truncate">
                              {tool.description}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
              
              {/* New Opportunity Button */}
              <Link href="/new-opportunity">
                <Button variant="outline" className="w-full gap-2 mt-2" data-testid="button-new-opportunity">
                  <FileText className="w-4 h-4" />
                  Submit New Opportunity
                </Button>
              </Link>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
