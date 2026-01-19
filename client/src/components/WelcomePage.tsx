import { Button } from "@/components/ui/button";
import { BookOpen, ClipboardCheck, Bot, Wrench, ArrowRight, Shield, Zap, Target } from "lucide-react";
import albersLogo from "@assets/albers-logo.svg";
import bouLogo from "@assets/BOU Logo_1761852944225.png";
import bgImage from "@assets/stock_images/us_military_fighter__6f8a6080.jpg";

interface WelcomePageProps {
  onGetStarted?: () => void;
}

export default function WelcomePage({ onGetStarted }: WelcomePageProps) {
  return (
    <div className="min-h-[calc(100vh-120px)] relative overflow-hidden">
      {/* Background with aerospace imagery */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-5"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-24 sm:pb-32">
        
        {/* Header Section */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="flex justify-center mb-1">
            <img src={albersLogo} alt="Albers Aerospace" className="h-10 sm:h-14" />
          </div>
          
          <div className="flex justify-center items-center gap-4 mb-3">
            <img src={bouLogo} alt="BOU" className="h-32 sm:h-48" />
            <span className="text-2xl sm:text-4xl font-bold text-foreground">Business Operations Unit (BOU) Portal</span>
          </div>
          
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
            Your one-stop shop for all Business Development and Operations activities. Access training, SOPs, 
            BD tools, opportunity intake, templates, analytics, and AI-powered assistance—all in one integrated platform.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="bg-card border border-card-border rounded-lg p-5 sm:p-6 hover-elevate group">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
              <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">AI-Powered Assistance</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Albers Bot provides instant answers with complete knowledge of all SOPs and processes
            </p>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5 sm:p-6 hover-elevate group">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
              <Target className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">Complete BD/BOU Hub</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Training, tools, templates, and resources for all Business Development and Operations activities
            </p>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5 sm:p-6 hover-elevate group sm:col-span-2 md:col-span-1">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
              <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">Mission-Ready Tools</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Decision matrices, analytics, and documentation designed for warfighter-focused operations
            </p>
          </div>
        </div>

        {/* Main Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8 sm:mb-12">
          <div className="bg-card border border-card-border rounded-lg p-5 hover-elevate group">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-3 group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">SOPs & Flowcharts</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Visual opportunity lifecycle with inline document viewing and Gates 1-3 workflow
            </p>
          </div>
          
          <div className="bg-card border border-card-border rounded-lg p-5 hover-elevate group">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-3 group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
              <ClipboardCheck className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Capture Questions</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              42 comprehensive questions across Analysis, Intel, and Solution phases with auto-email
            </p>
          </div>
          
          <div className="bg-card border border-card-border rounded-lg p-5 hover-elevate group">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-3 group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
              <Wrench className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">BD/BOU Tools & Templates</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Opportunity intake form, Bid/No-Bid matrix, BI analytics, proposal templates, and integration with business systems
            </p>
          </div>
          
          <div className="bg-card border border-card-border rounded-lg p-5 hover-elevate group">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-3 group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Albers Bot</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Context-aware AI assistant with document upload and text improvement features
            </p>
          </div>
        </div>

        {/* Key Capabilities */}
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-5 sm:p-8 mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">What You Can Do</h2>
          <div className="grid sm:grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-3 sm:gap-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <div>
                <p className="font-medium">Navigate Gates 1-3 Process</p>
                <p className="text-sm text-muted-foreground">Interactive flowchart and comprehensive SOP library</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <div>
                <p className="font-medium">Evaluate Opportunities</p>
                <p className="text-sm text-muted-foreground">Risk assessment with Bid/No-Bid decision matrix and pWin analysis</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <div>
                <p className="font-medium">Submit New Opportunities</p>
                <p className="text-sm text-muted-foreground">Send opportunity information to CRM Manager for input into CRM platform</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <div>
                <p className="font-medium">Complete Capture Questions</p>
                <p className="text-sm text-muted-foreground">42 questions with automatic email at 100% completion</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <div>
                <p className="font-medium">Get AI Assistance</p>
                <p className="text-sm text-muted-foreground">Context-aware help, text improvement, and document analysis</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <div>
                <p className="font-medium">Access Business Intelligence</p>
                <p className="text-sm text-muted-foreground">SSO integration with BI reports and analytics dashboard</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <div>
                <p className="font-medium">Launch External Tools</p>
                <p className="text-sm text-muted-foreground">Quick access to ClickUp, GovDash, and Salesforce</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-card border border-card-border rounded-lg p-6 sm:p-8 text-center">
          <h3 className="text-xl sm:text-2xl font-bold mb-3">Ready to Get Started?</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-2xl mx-auto px-2">
            Access SOPs, evaluate opportunities, and get AI-powered assistance for your capture and proposal processes. 
            Built for BD and Capture Managers supporting the warfighter mission.
          </p>
          
          <Button 
            size="lg" 
            onClick={onGetStarted}
            data-testid="button-get-started"
            className="w-full sm:w-auto"
          >
            Explore the Portal
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-8 sm:mt-12 text-center space-y-2 px-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            For questions or support, contact the Business Operations Unit
          </p>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground break-words">
            Sr. BOU Manager: Greg James (gjames@albers.aero)
          </p>
        </div>
      </div>
    </div>
  );
}
