import { useState } from "react";
import { Home, BookOpen, FileText, HelpCircle, BarChart3, FolderOpen, ClipboardCheck, ChevronDown, Bot, Wrench, CheckSquare, LayoutDashboard, ExternalLink, Presentation, Menu, X, FilePlus2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  icon: React.ElementType;
  value: string;
  children?: NavItem[];
  externalLink?: string;
}

const navItems: NavItem[] = [
  { label: "Home", icon: Home, value: "home" },
  { label: "SOPs & Processes", icon: BookOpen, value: "sops" },
  {
    label: "Business Operations Tools",
    icon: Wrench,
    value: "bo-tools",
    children: [
      { 
        label: "Training", 
        icon: Presentation, 
        value: "training"
      },
      { 
        label: "Business Intelligence (BI) Tool", 
        icon: BarChart3, 
        value: "bi-tool-ops",
        externalLink: "/api/easy-bi-reports"
      },
      { 
        label: "ClickUp", 
        icon: CheckSquare, 
        value: "clickup",
        externalLink: "https://app.clickup.com/login"
      },
      { 
        label: "GovDash", 
        icon: LayoutDashboard, 
        value: "govdash",
        externalLink: "https://dashboard.govdash.com/login?utm_medium=cpc&utm_source=google&utm_campaign=21330545960&utm_content=169736593424&utm_term=govdash&gclid=Cj0KCQjw9obIBhCAARIsAGHm1mTaZ9XlCLmnMIovKHHyb8Bxr8g52MwSmOZP_zijfnZgDdWEVnMuMH8aAg9lEALw_wcB&hsa_cam=21330545960&hsa_ad=700776093047&hsa_tgt=kwd-2200005170045&hsa_mt=p&hsa_net=adwords&hsa_acc=9744137894&hsa_grp=169736593424&hsa_src=g&hsa_kw=govdash&hsa_ver=3"
      },
    ]
  },
  { 
    label: "Business Development Tools", 
    icon: FolderOpen, 
    value: "bd-tools",
    children: [
      { 
        label: "Business Intelligence (BI) Tool", 
        icon: BarChart3, 
        value: "bi-tool-dev",
        externalLink: "/api/easy-bi-reports"
      },
      { 
        label: "Salesforce", 
        icon: ExternalLink, 
        value: "salesforce",
        externalLink: "https://albers.my.salesforce.com/"
      },
      { label: "New Opportunity Form", icon: FilePlus2, value: "new-opportunity" },
      { label: "Bid / No-Bid", icon: ClipboardCheck, value: "bidnobid" },
      { label: "Capture Questions", icon: FileText, value: "questions" },
    ]
  },
  { label: "Albers Bot", icon: Bot, value: "albers-bot" },
];

interface TopNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userEmail?: string;
}

export default function TopNav({ activeTab, onTabChange, userEmail }: TopNavProps) {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNavClick = (value: string) => {
    onTabChange(value);
    setMobileMenuOpen(false);
  };

  return (
    <div className="bg-card border-b border-border">
      <div className="px-3 sm:px-6 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden flex-shrink-0" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[350px]">
              <SheetHeader>
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.value || item.children?.some(child => child.value === activeTab);
                  
                  if (item.children) {
                    return (
                      <div key={item.value} className="space-y-1">
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium",
                          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                        )}>
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </div>
                        <div className="ml-6 space-y-1">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            return (
                              <button
                                key={child.value}
                                onClick={() => {
                                  if (child.externalLink) {
                                    if (child.externalLink.startsWith('/api/')) {
                                      window.open(child.externalLink, '_blank');
                                    } else {
                                      window.open(child.externalLink, '_blank', 'noopener,noreferrer');
                                    }
                                  } else {
                                    handleNavClick(child.value);
                                  }
                                }}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm w-full hover-elevate",
                                  activeTab === child.value ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                                )}
                                data-testid={`nav-${child.value}`}
                              >
                                <ChildIcon className="w-4 h-4" />
                                {child.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <button
                      key={item.value}
                      onClick={() => handleNavClick(item.value)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium hover-elevate",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      )}
                      data-testid={`nav-${item.value}`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>

          <img src="/albers-logo.png" alt="Albers" className="h-6 sm:h-8 flex-shrink-0" />
          <div className="min-w-0 hidden sm:block">
            <h1 className="font-semibold text-sm sm:text-base truncate">Business Operations Unit</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Internal Tools and Resources Portal</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <span className="text-xs sm:text-sm text-muted-foreground hidden lg:inline truncate max-w-[150px]">{userEmail || user?.email}</span>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-xs sm:text-sm text-muted-foreground hover:text-foreground whitespace-nowrap h-auto p-0"
            data-testid="button-logout"
            data-goatcounter-click="auth-logout"
            data-goatcounter-title="User logout action"
          >
            Logout
          </Button>
        </div>
      </div>
      
      {/* Desktop Navigation */}
      <nav className="px-6 gap-1 hidden md:flex">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.value || item.children?.some(child => child.value === activeTab);
          
          // Dropdown menu item
          if (item.children) {
            return (
              <DropdownMenu key={item.value}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                      isActive
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    data-testid={`nav-${item.value}`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    
                    // For internal API endpoints (SSO), open in new tab to preserve portal session
                    if (child.externalLink && child.externalLink.startsWith('/api/')) {
                      return (
                        <DropdownMenuItem key={child.value} asChild>
                          <a
                            href={child.externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`nav-${child.value}`}
                            className="flex items-center"
                          >
                            <ChildIcon className="w-4 h-4 mr-2" />
                            {child.label}
                          </a>
                        </DropdownMenuItem>
                      );
                    }
                    
                    return (
                      <DropdownMenuItem
                        key={child.value}
                        onClick={() => {
                          if (child.externalLink) {
                            window.open(child.externalLink, '_blank', 'noopener,noreferrer');
                          } else {
                            onTabChange(child.value);
                          }
                        }}
                        data-testid={`nav-${child.value}`}
                      >
                        <ChildIcon className="w-4 h-4 mr-2" />
                        {child.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }
          
          // Regular nav item
          return (
            <button
              key={item.value}
              onClick={() => onTabChange(item.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                isActive
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              data-testid={`nav-${item.value}`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
