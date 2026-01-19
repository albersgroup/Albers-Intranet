import { useLocation, Link } from "wouter";
import { 
  Building2, 
  Shield, 
  Factory, 
  Sparkles,
  Home,
  BookOpen,
  Presentation,
  BarChart3,
  CheckSquare,
  LayoutDashboard,
  FilePlus2,
  ClipboardCheck,
  FileText,
  Bot,
  ExternalLink,
  Newspaper,
  Archive,
  Settings,
  ChevronRight,
  Users,
  DollarSign,
  Heart,
  Calendar,
  FolderOpen,
  ShoppingBag,
  Target,
  Briefcase,
  Plane
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/use-auth";
import ThemeToggle from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { isAnyAdmin, canAccessAdminPanel, canEditDivision, canEditBouAdmin, canEditBdAdmin, getRoleDisplayName, DIVISION_NAMES } from "@/lib/permissions";

interface NavItem {
  title: string;
  icon: React.ElementType;
  url?: string;
  externalUrl?: string;
  children?: NavItem[];
}

interface DivisionConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  items: NavItem[];
}

const divisions: DivisionConfig[] = [
  {
    id: "corporate",
    title: "Albers Corporate",
    subtitle: "Business Operations",
    icon: Building2,
    color: "text-primary",
    items: [
      { title: "Home", icon: Home, url: "/" },
      { title: "All News Bulletins", icon: Archive, url: "/news-archive" },
      { title: "SOPs & Processes", icon: BookOpen, url: "/sops" },
      { title: "Tools and Resources", icon: FolderOpen, url: "/tools-resources" },
      { title: "The Albers Store", icon: ShoppingBag, externalUrl: "https://www.albersgear.com/" },
      { 
        title: "Business Development", 
        icon: FileText, 
        children: [
          { title: "BD Home", icon: Home, url: "/business-development" },
          { title: "IDIQ Management", icon: Target, url: "/idiq-management" },
          { title: "Bid / No-Bid", icon: ClipboardCheck, url: "/bid-no-bid" },
          { title: "New Opportunity Form", icon: FilePlus2, url: "/new-opportunity" },
          { title: "Capture Questions", icon: FileText, url: "/capture-questions" },
          { title: "Trips & Events", icon: Plane, url: "/trip-reports" },
        ]
      },
      { 
        title: "Business Operations Unit", 
        icon: Presentation, 
        children: [
          { title: "BOU Home", icon: Home, url: "/bou" },
          { title: "Proposal Dashboard", icon: LayoutDashboard, url: "/proposal-dashboard" },
          { title: "Training", icon: Presentation, url: "/training" },
          { title: "Business Intelligence Tool", icon: BarChart3, externalUrl: "/api/easy-bi-reports" },
          { title: "GovDash", icon: LayoutDashboard, externalUrl: "https://dashboard.govdash.com/login" },
          { title: "ClickUp", icon: CheckSquare, externalUrl: "https://app.clickup.com/login" },
          { title: "Salesforce", icon: ExternalLink, externalUrl: "https://albers.my.salesforce.com/" },
        ]
      },
      { 
        title: "Finance & HR", 
        icon: Users, 
        children: [
          { title: "Unanet (Timekeeping)", icon: Calendar, externalUrl: "https://albers-aero.unanet.biz/albers-aero/action/login" },
          { title: "Rippling (HR & Payroll)", icon: Users, externalUrl: "https://app.rippling.com/" },
          { title: "401k / Retirement", icon: DollarSign, externalUrl: "https://www.principal.com/" },
          { title: "Healthcare Portal", icon: Heart, externalUrl: "https://www.anthem.com/" },
        ]
      },
      { title: "Albers Bot", icon: Bot, url: "/albers-bot" },
    ]
  },
  {
    id: "defense",
    title: "Albers Defense",
    subtitle: "Defense Division",
    icon: Shield,
    color: "text-blue-600",
    items: [
      { title: "Home", icon: Home, url: "/defense" },
    ]
  },
  {
    id: "industrials",
    title: "Albers Industrials",
    subtitle: "Industrial Division",
    icon: Factory,
    color: "text-amber-600",
    items: [
      { title: "Home", icon: Home, url: "/industrials" },
    ]
  },
  {
    id: "advanced_programs",
    title: "Albers Advanced Programs",
    subtitle: "Advanced Programs",
    icon: Sparkles,
    color: "text-purple-600",
    items: [
      { title: "Home", icon: Home, url: "/special-projects" },
    ]
  }
];

export default function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const toggleDivision = (divisionId: string) => {
    setExpandedDivisions(prev => {
      const next = new Set(prev);
      if (next.has(divisionId)) {
        next.delete(divisionId);
      } else {
        next.add(divisionId);
      }
      return next;
    });
  };

  const toggleMenu = (menuKey: string) => {
    setExpandedMenus(prev => {
      const next = new Set(prev);
      if (next.has(menuKey)) {
        next.delete(menuKey);
      } else {
        next.add(menuKey);
      }
      return next;
    });
  };

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  const handleLogout = async () => {
    await logout();
  };

  const renderNavItem = (item: NavItem, divisionId: string, index: number) => {
    const menuKey = `${divisionId}-${item.title}`;
    const Icon = item.icon;

    if (item.children) {
      return (
        <Collapsible
          key={menuKey}
          open={expandedMenus.has(menuKey)}
          onOpenChange={() => toggleMenu(menuKey)}
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="w-full" data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <Icon className="w-4 h-4" />
                <span>{item.title}</span>
                <ChevronRight className={`ml-auto w-4 h-4 transition-transform ${expandedMenus.has(menuKey) ? "rotate-90" : ""}`} />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.children.map((child, childIndex) => {
                  const ChildIcon = child.icon;
                  
                  if (child.externalUrl) {
                    return (
                      <SidebarMenuSubItem key={childIndex}>
                        <SidebarMenuSubButton asChild>
                          <a
                            href={child.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`nav-${child.title.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            <ChildIcon className="w-4 h-4" />
                            <span>{child.title}</span>
                            <ExternalLink className="ml-auto w-3 h-3 opacity-50" />
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  }
                  
                  return (
                    <SidebarMenuSubItem key={childIndex}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={isActive(child.url!)}
                      >
                        <Link href={child.url!} data-testid={`nav-${child.title.toLowerCase().replace(/\s+/g, "-")}`}>
                          <ChildIcon className="w-4 h-4" />
                          <span>{child.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    if (item.externalUrl) {
      return (
        <SidebarMenuItem key={index}>
          <SidebarMenuButton asChild>
            <a
              href={item.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.title}</span>
              <ExternalLink className="ml-auto w-3 h-3 opacity-50" />
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuItem key={index}>
        <SidebarMenuButton
          asChild
          isActive={isActive(item.url!)}
        >
          <Link href={item.url!} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <Icon className="w-4 h-4" />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img src="/albers-logo.png" alt="Albers Aerospace" className="h-8" />
          <div className="min-w-0">
            <h2 className="font-semibold text-sm truncate">Albers Aerospace</h2>
            <p className="text-xs text-muted-foreground">Company Intranet</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {divisions.map((division) => {
          const DivisionIcon = division.icon;
          const isExpanded = expandedDivisions.has(division.id);
          
          return (
            <Collapsible
              key={division.id}
              open={isExpanded}
              onOpenChange={() => toggleDivision(division.id)}
            >
              <SidebarGroup className="pb-2">
                <CollapsibleTrigger asChild>
                  <div 
                    className="cursor-pointer hover-elevate rounded-lg mx-2 px-3 py-2.5 flex items-center gap-3 bg-sidebar-accent/50 border border-sidebar-border/50"
                    data-testid={`division-${division.id}`}
                  >
                    <div className={`p-1.5 rounded-md bg-background/80 ${division.color}`}>
                      <DivisionIcon className="w-4 h-4" />
                    </div>
                    <span className="flex-1 font-semibold text-sm">{division.title}</span>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent className="mt-1 ml-2 pl-3 border-l-2 border-sidebar-border/70">
                    <SidebarMenu>
                      {division.items.map((item, index) => renderNavItem(item, division.id, index))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}

        {isAnyAdmin(user?.role) && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span>Administration</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* System Admin gets full control panel access */}
                {canAccessAdminPanel(user?.role) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/admin"}>
                      <Link href="/admin" data-testid="nav-admin-control-panel">
                        <Users className="w-4 h-4" />
                        <span>System Control Panel</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {/* System Admin and BOU Admin can manage BOU content */}
                {canEditBouAdmin(user?.role) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/admin/bou")}>
                      <Link href="/admin/bou" data-testid="nav-admin-bou">
                        <Presentation className="w-4 h-4" />
                        <span>BOU Control Panel</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {canEditBdAdmin(user?.role) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/admin/bd")}>
                      <Link href="/admin/bd" data-testid="nav-admin-bd">
                        <Briefcase className="w-4 h-4" />
                        <span>BD Control Panel</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {/* Division Control Panels - for System Admin and Division-specific admins */}
                {canAccessAdminPanel(user?.role) && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/admin/division/corporate")}>
                        <Link href="/admin/division/corporate" data-testid="nav-admin-corporate">
                          <Building2 className="w-4 h-4" />
                          <span>Corporate Control Panel</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/admin/division/defense")}>
                        <Link href="/admin/division/defense" data-testid="nav-admin-defense">
                          <Shield className="w-4 h-4" />
                          <span>Defense Control Panel</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/admin/division/industrials")}>
                        <Link href="/admin/division/industrials" data-testid="nav-admin-industrials">
                          <Factory className="w-4 h-4" />
                          <span>Industrials Control Panel</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/admin/division/advanced-programs")}>
                        <Link href="/admin/division/advanced-programs" data-testid="nav-admin-advanced-programs">
                          <Sparkles className="w-4 h-4" />
                          <span>Advanced Programs Control Panel</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
                {/* Division-specific admins see their own edit page only */}
                {!canAccessAdminPanel(user?.role) && isAnyAdmin(user?.role) && (
                  <>
                    {canEditDivision(user?.role, "corporate") && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/admin/division/corporate")}>
                          <Link href="/admin/division/corporate" data-testid="nav-admin-corporate">
                            <Building2 className="w-4 h-4" />
                            <span>Corporate Control Panel</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    {canEditDivision(user?.role, "defense") && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/admin/division/defense")}>
                          <Link href="/admin/division/defense" data-testid="nav-admin-defense">
                            <Shield className="w-4 h-4" />
                            <span>Defense Control Panel</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    {canEditDivision(user?.role, "industrials") && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/admin/division/industrials")}>
                          <Link href="/admin/division/industrials" data-testid="nav-admin-industrials">
                            <Factory className="w-4 h-4" />
                            <span>Industrials Control Panel</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    {canEditDivision(user?.role, "advanced_programs") && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/admin/division/advanced-programs")}>
                          <Link href="/admin/division/advanced-programs" data-testid="nav-admin-advanced-programs">
                            <Sparkles className="w-4 h-4" />
                            <span>Advanced Programs Control Panel</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-primary">
                  {user?.firstName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email}
                </p>
                <p className="text-xs text-muted-foreground">{getRoleDisplayName(user?.role || "viewer")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-xs"
                data-testid="button-logout"
              >
                Logout
              </Button>
            </div>
          </div>
          {user?.lastLogin && (
            <p className="text-xs text-muted-foreground pl-10">
              Last login: {new Date(user.lastLogin).toLocaleString()}
            </p>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
