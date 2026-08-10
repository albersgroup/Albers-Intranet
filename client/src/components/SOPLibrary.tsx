import { sanitizeHtml } from "@/lib/sanitize";
import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Clipboard, TrendingUp, Users, FileText, Calendar, DollarSign, Globe, Loader2, ChevronDown, ChevronUp, Star, Share2, Filter } from "lucide-react";
import SOPCard from "./SOPCard";
import ProposalLifecycleVisual from "./ProposalLifecycleVisual";
import OpportunityLifecycleVisual from "./OpportunityLifecycleVisual";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Category metadata for consistent color coding and icons
const categoryMeta: Record<string, { color: string; bgClass: string; borderClass: string }> = {
  "Gate Process": { 
    color: "bg-[#51142a]", 
    bgClass: "bg-[#51142a]/10",
    borderClass: "border-[#51142a]/30"
  },
  "Capture & BD": { 
    color: "bg-[#153D63]", 
    bgClass: "bg-[#153D63]/10",
    borderClass: "border-[#153D63]/30"
  },
  "Proposal Management": { 
    color: "bg-[#894501]", 
    bgClass: "bg-[#894501]/10",
    borderClass: "border-[#894501]/30"
  },
  "Planning & Resources": { 
    color: "bg-[#3A7C22]", 
    bgClass: "bg-[#3A7C22]/10",
    borderClass: "border-[#3A7C22]/30"
  },
  "Reference & Training": { 
    color: "bg-[#0E2841]", 
    bgClass: "bg-[#0E2841]/10",
    borderClass: "border-[#0E2841]/30"
  }
};

const sopCategories = [
  {
    title: "Gate Process",
    sops: [
      {
        title: "Gate 1 Workflow – Qualification Review",
        description: "Ensure only aligned, viable opportunities advance beyond the Discover phase. Learn requirements for shaping, customer engagement, and teaming decisions.",
        category: "Gate Process",
        icon: <Clipboard className="w-6 h-6 text-primary-foreground" />,
        usedCount: 12
      },
      {
        title: "Gates 1-3 Complete Workflow",
        description: "Complete guide to all three gates in the opportunity lifecycle. Understand the full progression from discovery to proposal commitment.",
        category: "Gate Process",
        icon: <Clipboard className="w-6 h-6 text-primary-foreground" />,
        usedCount: 18,
        isNew: true
      },
      {
        title: "Stakeholder Routing & Approval – Gates 1, 2, and 3",
        description: "Learn the approval workflows and stakeholder routing for all three gates. Understand who reviews what and when decisions are made.",
        category: "Gate Process",
        icon: <Users className="w-6 h-6 text-primary-foreground" />,
        usedCount: 10
      }
    ]
  },
  {
    title: "Capture & BD",
    sops: [
      {
        title: "Target Phase Execution – Shaping & Gate 2",
        description: "Execute the Target Phase between Gate 1 and Gate 2. Learn how to shape opportunities, engage customers, and prepare for capture ownership.",
        category: "Capture Process",
        icon: <TrendingUp className="w-6 h-6 text-primary-foreground" />,
        usedCount: 9
      },
      {
        title: "Capture Phase Execution",
        description: "Execute the Capture Phase from Draft RFP to Final RFP. Learn how to refine solutions, finalize teams, validate pricing, and ensure Gate 3 readiness.",
        category: "Capture Process",
        icon: <Users className="w-6 h-6 text-primary-foreground" />,
        usedCount: 7
      },
      {
        title: "Bid/No-Bid Decision Framework",
        description: "A structured method for deciding whether to pursue or decline an opportunity. Designed to preserve resources and ensure alignment with company strategy.",
        category: "Decision Process",
        icon: <TrendingUp className="w-6 h-6 text-primary-foreground" />,
        usedCount: 10,
        isNew: true
      },
      {
        title: "No-Bid Decision & Risk Flagging",
        description: "Understand when and how to make no-bid decisions. Learn the process for flagging risks and communicating decisions to stakeholders.",
        category: "Decision Process",
        icon: <TrendingUp className="w-6 h-6 text-primary-foreground" />,
        usedCount: 6
      },
      {
        title: "Opportunity Entry & Notification",
        description: "Ensure every opportunity is meaningful, aligned with strategy, and documented. Learn the intake, validation, and notification process from discovery to Salesforce.",
        category: "Intake Process",
        icon: <FileText className="w-6 h-6 text-primary-foreground" />,
        usedCount: 18
      },
      {
        title: "Strategic BD Pipeline – Using Salesforce",
        description: "Master Salesforce for BD pipeline management. Learn to track opportunities, update status, and maintain accurate forecasts.",
        category: "Strategic Planning",
        icon: <Globe className="w-6 h-6 text-primary-foreground" />,
        usedCount: 8
      }
    ]
  },
  {
    title: "Proposal Management",
    sops: [
      {
        title: "Proposal Phase Execution",
        description: "Guide for executing compliant, compelling proposals once an opportunity clears Gate 3. Includes volume development, color reviews, and final production.",
        category: "Proposal Process",
        icon: <FileText className="w-6 h-6 text-primary-foreground" />,
        usedCount: 9
      },
      {
        title: "Proposal Kickoff & Brief",
        description: "Formally initiate proposal development by aligning stakeholders on opportunity, schedule, and responsibilities. Ensure unified understanding of requirements.",
        category: "Proposal Process",
        icon: <Calendar className="w-6 h-6 text-primary-foreground" />,
        usedCount: 11
      },
      {
        title: "Complete Proposal Management SOP",
        description: "Comprehensive proposal management guide covering the full lifecycle from kickoff to submission. Master proposal best practices and processes.",
        category: "Proposal Process",
        icon: <FileText className="w-6 h-6 text-primary-foreground" />,
        usedCount: 14
      }
    ]
  },
  {
    title: "Planning & Resources",
    sops: [
      {
        title: "Annual Operating Plan (AOP)",
        description: "Understand Albers' yearly roadmap for revenue, bookings, and growth targets. Learn how opportunities are selected, prioritized, and resourced.",
        category: "Strategic Planning",
        icon: <DollarSign className="w-6 h-6 text-primary-foreground" />,
        usedCount: 5
      },
      {
        title: "B&P Management",
        description: "Learn how Capture Managers plan, request, and manage Bid & Proposal resources. Ensure proposals are supported within budget and tracked accurately.",
        category: "Resource Management",
        icon: <DollarSign className="w-6 h-6 text-primary-foreground" />,
        usedCount: 6
      },
      {
        title: "Global Trade Compliance",
        description: "Ensure compliance with U.S. and international trade regulations governing export, import, transfer of defense articles and technology.",
        category: "Compliance",
        icon: <Globe className="w-6 h-6 text-primary-foreground" />,
        usedCount: 4
      },
      {
        title: "Monthly Discover Phase Triage",
        description: "Learn the monthly review process for opportunities in the Discover phase. Understand prioritization, resource allocation, and pipeline management.",
        category: "Process Management",
        icon: <Calendar className="w-6 h-6 text-primary-foreground" />,
        usedCount: 7
      }
    ]
  },
  {
    title: "Reference & Training",
    sops: [
      {
        title: "BOU Process Introduction",
        description: "Introduction to the Business Operations Unit processes and philosophy. Essential reading for new BD, Capture, and Proposal team members.",
        category: "Reference",
        icon: <FileText className="w-6 h-6 text-primary-foreground" />,
        usedCount: 22
      },
      {
        title: "Key Roles and Responsibilities",
        description: "Understand the roles and responsibilities of BD Managers, Capture Managers, Proposal Managers, and supporting functions throughout the opportunity lifecycle.",
        category: "Reference",
        icon: <Users className="w-6 h-6 text-primary-foreground" />,
        usedCount: 16
      },
      {
        title: "Opportunity Types",
        description: "Learn to classify and understand different opportunity types: new business, recompete, IDIQ task orders, modifications, and their unique characteristics.",
        category: "Reference",
        icon: <FileText className="w-6 h-6 text-primary-foreground" />,
        usedCount: 12
      },
      {
        title: "Vertical-Specific Differences",
        description: "Understand how BOU processes adapt across different market verticals. Learn unique requirements for DoD, civilian agencies, and commercial work.",
        category: "Guidance",
        icon: <Globe className="w-6 h-6 text-primary-foreground" />,
        usedCount: 8
      }
    ]
  }
];


interface SOPContent {
  title: string;
  category: string;
  content: string;
  filename: string;
}

export default function SOPLibrary() {
  const searchString = useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSOP, setSelectedSOP] = useState<SOPContent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFlowchartOpen, setIsFlowchartOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"mostUsed" | "alphabetical" | "category">("mostUsed");
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(
    new Set(sopCategories.map(cat => cat.title))
  );
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(
    new Set(sopCategories.map(cat => cat.title))
  );

  // Handle direct link to specific SOP via ?doc= query parameter
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const docTitle = params.get("doc");
    if (docTitle) {
      handleViewSOP(docTitle);
    }
  }, [searchString]);

  const toggleCategory = (categoryTitle: string) => {
    const newSet = new Set(visibleCategories);
    if (newSet.has(categoryTitle)) {
      newSet.delete(categoryTitle);
    } else {
      newSet.add(categoryTitle);
    }
    setVisibleCategories(newSet);
  };

  const toggleAccordion = (categoryTitle: string) => {
    const newSet = new Set(openAccordions);
    if (newSet.has(categoryTitle)) {
      newSet.delete(categoryTitle);
    } else {
      newSet.add(categoryTitle);
    }
    setOpenAccordions(newSet);
  };

  const handleViewSOP = async (title: string) => {
    setIsLoading(true);
    setIsDialogOpen(true);
    
    try {
      const response = await fetch(`/api/sops/${encodeURIComponent(title)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch SOP content");
      }
      const data = await response.json();
      setSelectedSOP(data);
    } catch (error) {
      console.error("Error fetching SOP:", error);
      setSelectedSOP(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Table of Contents Component with Filters
  const TableOfContents = () => (
    <Card className="p-4 sm:p-6 sticky top-4" data-testid="card-table-of-contents">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-base sm:text-lg font-bold">Table of Contents</h2>
      </div>
      
      <nav className="space-y-3">
        {sopCategories.map((category) => (
          <div key={category.title} className="border-b border-border pb-3 last:border-0">
            <div className="flex items-start gap-2 mb-2">
              <Checkbox
                id={`category-${category.title}`}
                checked={visibleCategories.has(category.title)}
                onCheckedChange={() => toggleCategory(category.title)}
                className="mt-0.5"
                data-testid={`checkbox-category-${category.title.toLowerCase().replace(/\s+/g, '-')}`}
              />
              <label
                htmlFor={`category-${category.title}`}
                className="font-semibold text-sm cursor-pointer select-none flex-1"
              >
                {category.title}
                <span className="text-muted-foreground ml-2 text-xs">
                  ({category.sops.length})
                </span>
              </label>
            </div>
          </div>
        ))}
      </nav>
    </Card>
  );

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-24 sm:pb-32">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-2">SOPs & Processes</h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
          Browse and learn from our standard operating procedures
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search SOPs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm"
              data-testid="input-search-sops"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-sort-by">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mostUsed">Most Used</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Two Column Layout: Table of Contents + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Left Column: Table of Contents - Now visible on all screen sizes */}
        <div className="lg:col-span-1">
          <TableOfContents />
        </div>
        
        {/* Right Column: Flowchart + SOP Cards */}
        <div className="lg:col-span-3 space-y-6">
          {/* Collapsible Opportunity Lifecycle Visual */}
          <Collapsible open={isFlowchartOpen} onOpenChange={setIsFlowchartOpen}>
            <Card className="p-4">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-between p-4 hover-elevate"
                  data-testid="button-toggle-flowchart"
                  data-goatcounter-click="bou-toggle-opportunity-lifecycle"
                  data-goatcounter-title="Toggle Opportunity Lifecycle Visual"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    <h2 className="text-lg font-bold">Albers Opportunity Lifecycle</h2>
                  </div>
                  {isFlowchartOpen ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pt-2">
                  <OpportunityLifecycleVisual />
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Proposal Lifecycle Visual */}
          <Collapsible>
            <Card className="p-4">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-between p-4 hover-elevate"
                  data-testid="button-toggle-proposal-lifecycle"
                  data-goatcounter-click="bou-toggle-proposal-lifecycle"
                  data-goatcounter-title="Toggle Proposal Lifecycle Visual"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold">Albers Proposal Lifecycle</h2>
                    <Badge variant="secondary" className="ml-2 bg-emerald-600 text-white border-emerald-500">
                      New
                    </Badge>
                  </div>
                  <ChevronDown className="w-5 h-5" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pt-2">
                  <ProposalLifecycleVisual />
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* SOP Categories as Collapsible Accordions */}
          {sopCategories.map((category) => {
            // Skip if category is filtered out
            if (!visibleCategories.has(category.title)) return null;

            // Filter SOPs based on search query
            const filteredSOPs = category.sops.filter(sop => 
              searchQuery === "" || 
              sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              sop.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
              sop.category.toLowerCase().includes(searchQuery.toLowerCase())
            );

            // Only show category if it has matching SOPs
            if (filteredSOPs.length === 0) return null;

            // Sort SOPs based on selected sort option
            const sortedSOPs = [...filteredSOPs].sort((a, b) => {
              if (sortBy === "mostUsed") {
                return (b.usedCount || 0) - (a.usedCount || 0);
              } else if (sortBy === "alphabetical") {
                return a.title.localeCompare(b.title);
              } else if (sortBy === "category") {
                // Sort by category alphabetically, then by title
                const categoryCompare = a.category.localeCompare(b.category);
                if (categoryCompare !== 0) return categoryCompare;
                return a.title.localeCompare(b.title);
              }
              return 0;
            });

            const isOpen = openAccordions.has(category.title);

            return (
              <Collapsible 
                key={category.title}
                open={isOpen}
                onOpenChange={() => toggleAccordion(category.title)}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full flex items-center justify-between p-4 hover-elevate"
                      data-testid={`button-toggle-${category.title.toLowerCase().replace(/\s+/g, '-')}`}
                      data-goatcounter-click={`bou-toggle-sop-category-${category.title.toLowerCase().replace(/\s+/g, '-')}`}
                      data-goatcounter-title={`Toggle SOP Category: ${category.title}`}
                    >
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold">{category.title}</h2>
                        <Badge variant="secondary" className="ml-2 bg-slate-700 text-white border-slate-600">
                          {sortedSOPs.length}
                        </Badge>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {sortedSOPs.map((sop: any, index) => (
                          <SOPCard
                            key={index}
                            title={sop.title}
                            description={sop.description}
                            category={sop.category}
                            usedCount={sop.usedCount}
                            icon={sop.icon}
                            onView={() => handleViewSOP(sop.title)}
                            isNew={sop.isNew}
                            categoryColor={categoryMeta[category.title]?.color}
                          />
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </div>

      {/* SOP Content Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl pr-8">
              {isLoading ? "Loading..." : selectedSOP?.title || "SOP Document"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedSOP?.category ? `Category: ${selectedSOP.category}` : "Standard Operating Procedure"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[calc(90vh-120px)] pr-2 sm:pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : selectedSOP ? (
              <div 
                className="sop-content prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={sanitizeHtml(selectedSOP.content)}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Failed to load SOP content. Please try again.
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
