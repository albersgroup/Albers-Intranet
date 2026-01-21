import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import albersLogoPath from "@assets/Logo Small_1761690161080.png";

const STORAGE_KEY = 'bidNoBid_draft';

export default function BidNoBidModule() {
  const { toast } = useToast();
  const chartRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Helper function to calculate rows based on content
  const calculateRows = (text: string): number => {
    if (!text) return 1;
    const lineCount = text.split('\n').length;
    return Math.max(1, lineCount);
  };
  
  // Component for field content - renders as textarea normally, as div during export
  const FieldContent = ({ value, onChange, sectionType = 'dark', placeholder = "INSERT", testId }: {
    value: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    sectionType?: 'blue' | 'dark';
    placeholder?: string;
    testId?: string;
  }) => {
    if (isExporting) {
      // During export: render as plain div with colored text
      const textColor = sectionType === 'blue' ? 'text-white' : 'text-[#CC5500]';
      return (
        <div className={`mt-1 py-1 whitespace-pre-wrap ${textColor} text-sm`} style={{ minHeight: '20px' }}>
          {value || ''}
        </div>
      );
    }
    
    // Normal mode: render as editable textarea
    const baseClasses = sectionType === 'blue'
      ? "mt-1 bg-white text-foreground resize-none min-h-0 py-1 border-white placeholder:text-muted-foreground/70"
      : "mt-1 resize-none min-h-0 py-1 bg-white text-foreground border-white placeholder:text-muted-foreground/70";
    
    return (
      <Textarea
        value={value}
        onChange={onChange}
        className={baseClasses}
        placeholder={placeholder}
        rows={calculateRows(value)}
        data-testid={testId}
      />
    );
  };
  
  const [solicitationName, setSolicitationName] = useState("");
  const [bidDate, setBidDate] = useState("");
  const [captureManager, setCaptureManager] = useState("");
  const [functionalTeam, setFunctionalTeam] = useState("");
  
  // Opportunity Description (4 fields)
  const [customer, setCustomer] = useState("");
  const [typeOfOpportunity, setTypeOfOpportunity] = useState("");
  const [productOrService, setProductOrService] = useState("");
  const [description, setDescription] = useState("");
  
  // Preliminary Revenue, Timing, pWin (4 fields)
  const [totalPrice, setTotalPrice] = useState("");
  const [timing, setTiming] = useState("");
  const [pWin, setPWin] = useState("");
  const [notes, setNotes] = useState("");
  
  // General / PM / Preliminary Risk Assessment (4 fields)
  const [pop, setPop] = useState("");
  const [competition, setCompetition] = useState("");
  const [riskTechnical, setRiskTechnical] = useState("");
  const [riskCost, setRiskCost] = useState("");
  const [riskSchedule, setRiskSchedule] = useState("");
  
  // Proposal LOE, Cost, and Schedule (4 fields)
  const [deadline, setDeadline] = useState("");
  const [proposalTeamMembers, setProposalTeamMembers] = useState("");
  const [proposalDeliverables, setProposalDeliverables] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");

  // Load saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        
        // Check if there's any actual content to restore (not just lastSaved timestamp)
        const hasContent = data.solicitationName || data.bidDate || data.captureManager || 
          data.functionalTeam || data.customer || data.typeOfOpportunity || 
          data.productOrService || data.description || data.totalPrice || 
          data.timing || data.pWin || data.notes || data.pop || data.competition ||
          data.riskTechnical || data.riskCost || data.riskSchedule || data.deadline ||
          data.proposalTeamMembers || data.proposalDeliverables || data.estimatedHours;
        
        if (data.solicitationName) setSolicitationName(data.solicitationName);
        if (data.bidDate) setBidDate(data.bidDate);
        if (data.captureManager) setCaptureManager(data.captureManager);
        if (data.functionalTeam) setFunctionalTeam(data.functionalTeam);
        if (data.customer) setCustomer(data.customer);
        if (data.typeOfOpportunity) setTypeOfOpportunity(data.typeOfOpportunity);
        if (data.productOrService) setProductOrService(data.productOrService);
        if (data.description) setDescription(data.description);
        if (data.totalPrice) setTotalPrice(data.totalPrice);
        if (data.timing) setTiming(data.timing);
        if (data.pWin) setPWin(data.pWin);
        if (data.notes) setNotes(data.notes);
        if (data.pop) setPop(data.pop);
        if (data.competition) setCompetition(data.competition);
        if (data.riskTechnical) setRiskTechnical(data.riskTechnical);
        if (data.riskCost) setRiskCost(data.riskCost);
        if (data.riskSchedule) setRiskSchedule(data.riskSchedule);
        if (data.deadline) setDeadline(data.deadline);
        if (data.proposalTeamMembers) setProposalTeamMembers(data.proposalTeamMembers);
        if (data.proposalDeliverables) setProposalDeliverables(data.proposalDeliverables);
        if (data.estimatedHours) setEstimatedHours(data.estimatedHours);
        if (data.lastSaved) setLastSaved(new Date(data.lastSaved));
        
        // Only show toast if there was actual content restored
        if (hasContent) {
          toast({
            title: "Draft Restored",
            description: "Your previous work has been restored.",
          });
        }
      }
    } catch (error) {
      console.error("Error loading draft:", error);
    }
  }, []);

  // Auto-save to localStorage whenever data changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        const draftData = {
          solicitationName,
          bidDate,
          captureManager,
          functionalTeam,
          customer,
          typeOfOpportunity,
          productOrService,
          description,
          totalPrice,
          timing,
          pWin,
          notes,
          pop,
          competition,
          riskTechnical,
          riskCost,
          riskSchedule,
          deadline,
          proposalTeamMembers,
          proposalDeliverables,
          estimatedHours,
          lastSaved: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
        setLastSaved(new Date());
      } catch (error) {
        console.error("Error saving draft:", error);
      }
    }, 1000); // Debounce: save 1 second after user stops typing

    return () => clearTimeout(timeoutId);
  }, [
    solicitationName, bidDate, captureManager, functionalTeam,
    customer, typeOfOpportunity, productOrService, description,
    totalPrice, timing, pWin, notes, pop, competition,
    riskTechnical, riskCost, riskSchedule, deadline,
    proposalTeamMembers, proposalDeliverables, estimatedHours
  ]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSolicitationName("");
      setBidDate("");
      setCaptureManager("");
      setFunctionalTeam("");
      setCustomer("");
      setTypeOfOpportunity("");
      setProductOrService("");
      setDescription("");
      setTotalPrice("");
      setTiming("");
      setPWin("");
      setNotes("");
      setPop("");
      setCompetition("");
      setRiskTechnical("");
      setRiskCost("");
      setRiskSchedule("");
      setDeadline("");
      setProposalTeamMembers("");
      setProposalDeliverables("");
      setEstimatedHours("");
      setLastSaved(null);
      
      toast({
        title: "Draft Cleared",
        description: "All saved work has been cleared.",
      });
    } catch (error) {
      console.error("Error clearing draft:", error);
    }
  }, [toast]);

  const handleDownload = async () => {
    if (!chartRef.current) return;

    try {
      // Enable export mode to style textareas for clean PNG export
      setIsExporting(true);
      
      // Wait for React to re-render with export styles
      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      // Reset to normal mode
      setIsExporting(false);

      const link = document.createElement('a');
      link.download = `BidNoBid_${captureManager || 'Chart'}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      // Clear the saved draft and reset all form state after successful download
      localStorage.removeItem(STORAGE_KEY);
      setLastSaved(null);
      
      // Reset all form fields
      setSolicitationName("");
      setBidDate("");
      setCaptureManager("");
      setFunctionalTeam("");
      setCustomer("");
      setTypeOfOpportunity("");
      setProductOrService("");
      setDescription("");
      setTotalPrice("");
      setTiming("");
      setPWin("");
      setNotes("");
      setPop("");
      setCompetition("");
      setRiskTechnical("");
      setRiskCost("");
      setRiskSchedule("");
      setDeadline("");
      setProposalTeamMembers("");
      setProposalDeliverables("");
      setEstimatedHours("");

      toast({
        title: "Success!",
        description: "Bid/No Bid chart downloaded successfully. Draft cleared.",
      });
    } catch (error) {
      console.error('Error downloading chart:', error);
      setIsExporting(false); // Reset on error
      toast({
        title: "Error",
        description: "Failed to download chart.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-full overflow-auto bg-background p-4 sm:p-6 pb-24 sm:pb-32" data-testid="module-bidnobid">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Bid / No-Bid Decision Matrix</h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
                Use this decision framework to evaluate opportunities and determine whether to pursue or decline. 
                Complete all fields to create a comprehensive assessment that can be downloaded and shared with stakeholders.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
              <Button
                onClick={clearDraft}
                variant="outline"
                data-testid="button-clear-draft-bidnobid"
                className="gap-2 flex-1 sm:flex-none"
                data-goatcounter-click="bou-bidnobid-clear-draft"
                data-goatcounter-title="Bid/No-Bid Clear Draft"
              >
                <Trash2 className="h-4 w-4" />
                Clear Draft
              </Button>
              <Button
                onClick={handleDownload}
                data-testid="button-download-chart"
                className="gap-2 flex-1 sm:flex-none"
                data-goatcounter-click="bou-bidnobid-download"
                data-goatcounter-title="Bid/No-Bid Download Chart"
              >
                <Download className="h-4 w-4" />
                Download Chart
              </Button>
            </div>
          </div>
          
          {lastSaved && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Save className="w-3 h-3" />
              <span>Auto-saved {new Date(lastSaved).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Instructions Card */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-4 sm:pt-6">
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-sm">
              <div>
                <h3 className="font-semibold mb-1 sm:mb-2 text-primary">1. Basic Information</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Enter solicitation details, dates, and team members</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1 sm:mb-2 text-primary">2. Opportunity Details</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Describe the customer, product/service, and requirements</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1 sm:mb-2 text-primary">3. Risk Assessment</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Evaluate technical, cost, and schedule risks</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1 sm:mb-2 text-primary">4. Download & Share</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Export as PNG for Gate review meetings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* The actual chart that will be downloaded */}
        <div ref={chartRef} className="bg-white">
          <Card className="overflow-hidden border-2 border-white">
            {/* Header */}
            <div className="bg-[#51142a] text-white p-6 flex items-center justify-between">
              <h1 className="text-3xl font-bold" data-testid="text-header">Bid / No-Bid</h1>
              <div className="bg-transparent">
                <img 
                  src={albersLogoPath} 
                  alt="Albers Aerospace" 
                  className="h-12 object-contain bg-transparent"
                  data-testid="img-logo"
                  style={{ background: 'transparent' }}
                />
              </div>
            </div>

            {/* Solicitation Info Row */}
            <div className="grid grid-cols-2 border-b-2 border-border">
              <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-r-2 border-border">
                <Label className="text-sm font-bold text-foreground">Solicitation Name:</Label>
                <FieldContent
                  value={solicitationName}
                  onChange={(e) => setSolicitationName(e.target.value)}
                  sectionType="dark"
                  placeholder="Enter solicitation name"
                  testId="input-solicitation-name"
                />
              </div>
              <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5">
                <Label className="text-sm font-bold text-foreground">Date of Bid/No-Bid:</Label>
                <FieldContent
                  value={bidDate}
                  onChange={(e) => setBidDate(e.target.value)}
                  sectionType="dark"
                  placeholder="Enter date"
                  testId="input-bid-date"
                />
              </div>
            </div>

            {/* Manager Info Row */}
            <div className="grid grid-cols-2 border-b-2 border-border">
              <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-r-2 border-border">
                <Label className="text-sm font-bold text-foreground">Capture Manager:</Label>
                <FieldContent
                  value={captureManager}
                  onChange={(e) => setCaptureManager(e.target.value)}
                  sectionType="dark"
                  placeholder="Enter name"
                  testId="input-capture-manager"
                />
              </div>
              <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5">
                <Label className="text-sm font-bold text-foreground">Functional Team:</Label>
                <FieldContent
                  value={functionalTeam}
                  onChange={(e) => setFunctionalTeam(e.target.value)}
                  sectionType="dark"
                  placeholder="Enter team"
                  testId="input-functional-team"
                />
              </div>
            </div>

            {/* Main Grid - 4 Quadrants */}
            <div className="grid grid-cols-2">
              {/* Top Left: Opportunity Description */}
              <div className="p-6 border-r-2 border-b-2 border-border bg-card">
                <h2 className="text-lg font-bold mb-4 text-foreground" data-testid="text-section-opportunity">
                  Opportunity Description
                </h2>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold text-foreground">1. Customer:</Label>
                    <FieldContent
                      value={customer}
                      onChange={(e) => setCustomer(e.target.value)}
                      testId="input-customer"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-foreground">2. Type of Opportunity:</Label>
                    <FieldContent
                      value={typeOfOpportunity}
                      onChange={(e) => setTypeOfOpportunity(e.target.value)}
                      testId="input-opportunity-type"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-foreground">3. Product or Service:</Label>
                    <FieldContent
                      value={productOrService}
                      onChange={(e) => setProductOrService(e.target.value)}
                      testId="input-product-service"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-foreground">4. Description:</Label>
                    <FieldContent
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      testId="textarea-description"
                    />
                  </div>
                </div>
              </div>

              {/* Top Right: Preliminary Revenue, Timing, pWin */}
              <div className="p-6 border-b-2 border-border bg-card">
                <h2 className="text-lg font-bold mb-4 text-foreground" data-testid="text-section-revenue">
                  Preliminary Revenue, Timing, pWin
                </h2>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold text-foreground">1. Total Price:</Label>
                    <FieldContent
                      value={totalPrice}
                      onChange={(e) => setTotalPrice(e.target.value)}
                      testId="input-total-price"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-foreground">2. Timing:</Label>
                    <FieldContent
                      value={timing}
                      onChange={(e) => setTiming(e.target.value)}
                      testId="input-timing"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-foreground">3. pWin:</Label>
                    <FieldContent
                      value={pWin}
                      onChange={(e) => setPWin(e.target.value)}
                      testId="input-pwin"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-foreground">4. Notes:</Label>
                    <FieldContent
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      testId="textarea-notes"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Left: General / PM / Preliminary Risk Assessment */}
              <div className="p-6 border-r-2 border-border bg-card">
                <h2 className="text-lg font-bold mb-4 text-foreground" data-testid="text-section-risk">
                  General / PM / Preliminary Risk Assessment
                </h2>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold text-foreground">1. PoP:</Label>
                    <FieldContent
                      value={pop}
                      onChange={(e) => setPop(e.target.value)}
                      testId="input-pop"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-foreground">2. Competition:</Label>
                    <FieldContent
                      value={competition}
                      onChange={(e) => setCompetition(e.target.value)}
                      testId="input-competition"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-foreground">3. Preliminary Risk Assessment:</Label>
                    <div className="mt-1 space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Technical:</Label>
                        <FieldContent
                          value={riskTechnical}
                          onChange={(e) => setRiskTechnical(e.target.value)}
                          placeholder="LOW, MED, HIGH"
                          testId="input-risk-technical"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Cost:</Label>
                        <FieldContent
                          value={riskCost}
                          onChange={(e) => setRiskCost(e.target.value)}
                          testId="input-risk-cost"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Schedule:</Label>
                        <FieldContent
                          value={riskSchedule}
                          onChange={(e) => setRiskSchedule(e.target.value)}
                          testId="input-risk-schedule"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Right: Proposal LOE, Cost, and Schedule */}
              <div className="p-6 bg-card">
                <h2 className="text-lg font-bold mb-4 text-foreground" data-testid="text-section-proposal">
                  Proposal LOE, Cost, and Schedule
                </h2>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold text-foreground">1. Deadline:</Label>
                    <FieldContent
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      testId="input-deadline"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-foreground">2. Proposal Team Members:</Label>
                    <FieldContent
                      value={proposalTeamMembers}
                      onChange={(e) => setProposalTeamMembers(e.target.value)}
                      testId="input-team-members"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-foreground">3. Proposal Deliverables:</Label>
                    <FieldContent
                      value={proposalDeliverables}
                      onChange={(e) => setProposalDeliverables(e.target.value)}
                      testId="input-deliverables"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-foreground">4. Estimated Hours for Bid Effort:</Label>
                    <FieldContent
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(e.target.value)}
                      testId="input-estimated-hours"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
