import React from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { usePageTracking } from "@/hooks/use-analytics";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import FloatingChatbot from "@/components/FloatingChatbot";
import { FEATURES } from "@/config/features";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import VerifyEmail from "@/pages/VerifyEmail";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/not-found";

import CorporateHome from "@/pages/corporate/CorporateHome";
import DefenseHome from "@/pages/defense/DefenseHome";
import IndustrialsHome from "@/pages/industrials/IndustrialsHome";
import SpecialProjectsHome from "@/pages/special-projects/SpecialProjectsHome";
import BOUHome from "@/pages/bou/BOUHome";
import ProposalDashboard from "@/pages/bou/ProposalDashboard";
import BusinessDevelopmentHome from "@/pages/BusinessDevelopmentHome";

import SOPLibrary from "@/components/SOPLibrary";
import ProposalTrainingModule from "@/components/ProposalTrainingModule";
import BidNoBidModule from "@/components/BidNoBidModule";
import CaptureQuestionsModule from "@/components/CaptureQuestionsModule";
import NewOpportunityForm from "@/components/NewOpportunityForm";
import AlbersBotPage from "@/components/AlbersBotPage";

import ControlPanel from "@/pages/admin/ControlPanel";
import DivisionAdminPage from "@/pages/admin/DivisionAdminPage";
import BOUAdminPage from "@/pages/admin/BOUAdminPage";
import BDAdminPage from "@/pages/admin/BDAdminPage";
import NewsArchivePage from "@/pages/corporate/NewsArchivePage";
import ToolsResources from "@/pages/ToolsResources";
import TripReports from "@/pages/TripReports";
import IdiqManagement from "@/pages/IdiqManagement";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" replace />;
  }

  return <Component />;
}

function SOPPage() {
  return (
    <div className="p-6">
      <SOPLibrary />
    </div>
  );
}

function ProposalTrainingPage() {
  return (
    <div className="p-6">
      <ProposalTrainingModule />
    </div>
  );
}

function BidNoBidPage() {
  return (
    <div className="p-6 h-[calc(100vh-80px)]">
      <BidNoBidModule />
    </div>
  );
}

function CaptureQuestionsPage() {
  return (
    <div className="p-6 h-[calc(100vh-80px)]">
      <CaptureQuestionsModule />
    </div>
  );
}

function NewOpportunityPage() {
  return (
    <div className="p-6 h-[calc(100vh-80px)]">
      <NewOpportunityForm />
    </div>
  );
}

function AlbersBotFullPage() {
  return <AlbersBotPage />;
}

function DefenseAdminPage() {
  return <DivisionAdminPage division="defense" divisionName="Defense" />;
}

function IndustrialsAdminPage() {
  return <DivisionAdminPage division="industrials" divisionName="Industrials" />;
}

function AdvancedProgramsAdminPage() {
  return <DivisionAdminPage division="advanced_programs" divisionName="Advanced Programs" />;
}

function CorporateAdminPage() {
  return <DivisionAdminPage division="corporate" divisionName="Corporate" features={{ layout: true, hero: true, quickLinks: true, newsletter: true, bulletins: true, news: true, linkedIn: true, analytics: true }} />;
}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-600">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <pre className="mt-4 text-sm">{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainLayout() {
  const sidebarStyle = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3.5rem",
  } as React.CSSProperties;

  return (
    <ErrorBoundary>
      <SidebarProvider style={sidebarStyle}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center gap-2 h-12 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <span className="text-sm font-medium text-muted-foreground flex-1">Albers Aerospace Intranet</span>
            </header>
            <main className="flex-1 overflow-auto bg-background">
              <Switch>
                {/* Corporate Pages */}
                <Route path="/" component={CorporateHome} />
                <Route path="/sops" component={SOPPage} />
                <Route path="/tools-resources" component={ToolsResources} />
                <Route path="/training" component={ProposalTrainingPage} />
                <Route path="/proposal-dashboard" component={ProposalDashboard} />
                <Route path="/bid-no-bid" component={BidNoBidPage} />
                <Route path="/capture-questions" component={CaptureQuestionsPage} />
                <Route path="/new-opportunity" component={NewOpportunityPage} />
                <Route path="/trip-reports" component={TripReports} />
                <Route path="/business-development" component={BusinessDevelopmentHome} />
                <Route path="/idiq-management" component={IdiqManagement} />
                <Route path="/albers-bot" component={AlbersBotFullPage} />
                <Route path="/news-archive" component={NewsArchivePage} />
                
                {/* Admin Pages */}
                <Route path="/admin" component={ControlPanel} />
                <Route path="/admin/division/defense" component={DefenseAdminPage} />
                <Route path="/admin/division/industrials" component={IndustrialsAdminPage} />
                <Route path="/admin/division/advanced-programs" component={AdvancedProgramsAdminPage} />
                <Route path="/admin/division/corporate" component={CorporateAdminPage} />
                <Route path="/admin/bou" component={BOUAdminPage} />
                <Route path="/admin/bd" component={BDAdminPage} />
                
                {/* Division Home Pages */}
                <Route path="/defense" component={DefenseHome} />
                <Route path="/industrials" component={IndustrialsHome} />
                <Route path="/special-projects" component={SpecialProjectsHome} />
                <Route path="/bou" component={BOUHome} />
                
                {/* Fallback */}
                <Route component={NotFound} />
              </Switch>
            </main>
            {FEATURES.ALBERS_BOT && (
              <FloatingChatbot
                pageContext="general"
                currentData={{}}
                pageName="Intranet"
              />
            )}
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ErrorBoundary>
  );
}

function ProtectedLayout() {
  return <ProtectedRoute component={MainLayout} />;
}

function PublicHome() {
  return (
    <div className="min-h-screen bg-background">
      <CorporateHome />
    </div>
  );
}

function Router() {
  // Track page views with Goatcounter
  usePageTracking();

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      {/* Public homepage - no authentication required */}
      <Route path="/" component={PublicHome} />
      <Route component={ProtectedLayout} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
