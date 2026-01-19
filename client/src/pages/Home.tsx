import { useState, ReactNode } from "react";
import TopNav from "@/components/TopNav";
import WelcomePage from "@/components/WelcomePage";
import SOPLibrary from "@/components/SOPLibrary";
import CaptureQuestionsModule from "@/components/CaptureQuestionsModule";
import BidNoBidModule from "@/components/BidNoBidModule";
import BusinessIntelligenceTool from "@/components/BusinessIntelligenceTool";
import AlbersBotPage from "@/components/AlbersBotPage";
import ProposalTrainingModule from "@/components/ProposalTrainingModule";
import NewOpportunityForm from "@/components/NewOpportunityForm";
import FloatingChatbot from "@/components/FloatingChatbot";

type PageContext = "general" | "capture-questions" | "sop-library" | "bid-no-bid" | "business-intelligence" | "albers-bot-full" | "training" | "new-opportunity";

interface RouteConfig {
  title: string;
  context: PageContext;
  render: (setActiveTab: (tab: string) => void, formData?: Record<string, any>, setFormData?: (data: Record<string, any>) => void) => ReactNode;
  getCurrentData?: () => Record<string, any>;
  hideFloatingChatbot?: boolean;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("home");
  const [formData, setFormData] = useState<Record<string, any>>({});

  const ROUTES: Record<string, RouteConfig> = {
    "home": {
      title: "Home",
      context: "general",
      render: (setActiveTab) => <WelcomePage onGetStarted={() => setActiveTab("sops")} />,
    },
    "questions": {
      title: "Capture Questions",
      context: "capture-questions",
      render: (_, __, setFormData) => (
        <div className="h-[calc(100vh-120px)]">
          <CaptureQuestionsModule onFormDataChange={setFormData!} />
        </div>
      ),
      getCurrentData: () => formData,
    },
    "sops": {
      title: "SOP Library",
      context: "sop-library",
      render: () => <SOPLibrary />,
    },
    "bidnobid": {
      title: "Bid/No Bid",
      context: "bid-no-bid",
      render: () => (
        <div className="h-[calc(100vh-120px)]">
          <BidNoBidModule />
        </div>
      ),
    },
    "new-opportunity": {
      title: "New Opportunity Form",
      context: "new-opportunity",
      render: () => (
        <div className="h-[calc(100vh-120px)]">
          <NewOpportunityForm />
        </div>
      ),
    },
    "bi-tool": {
      title: "Business Intelligence Tool",
      context: "business-intelligence",
      render: () => <BusinessIntelligenceTool />,
    },
    "albers-bot": {
      title: "Albers Bot",
      context: "albers-bot-full",
      render: () => <AlbersBotPage />,
      hideFloatingChatbot: true,
    },
    "training": {
      title: "Training",
      context: "training",
      render: () => <ProposalTrainingModule />,
    },
  };

  const currentRoute = ROUTES[activeTab] ?? ROUTES["home"];

  return (
    <div className="min-h-screen bg-background">
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main>
        {currentRoute.render(setActiveTab, formData, setFormData)}
      </main>

      {!currentRoute.hideFloatingChatbot && (
        <FloatingChatbot 
          pageContext={currentRoute.context}
          currentData={currentRoute.getCurrentData ? currentRoute.getCurrentData() : {}}
          pageName={currentRoute.title}
        />
      )}
    </div>
  );
}
