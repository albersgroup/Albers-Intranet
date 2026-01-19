import { 
  Search, 
  ClipboardCheck, 
  Target, 
  Users, 
  FileCheck, 
  ArrowRight,
  Lightbulb,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface LifecycleStage {
  id: number;
  phase: string;
  title: string;
  description: string;
  keyActivities: string[];
  owner: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

const lifecycleStages: LifecycleStage[] = [
  {
    id: 1,
    phase: "Discover",
    title: "Opportunity Identification",
    description: "Identify and validate potential opportunities through market research and strategic alignment.",
    keyActivities: [
      "Market scanning & opportunity identification",
      "Initial strategic fit assessment",
      "New Business Opportunity Form",
      "Salesforce opportunity entry"
    ],
    owner: "Business Development",
    icon: <Search className="w-6 h-6" />,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300"
  },
  {
    id: 2,
    phase: "Gate 1",
    title: "Qualification Review",
    description: "Leadership reviews opportunity for strategic alignment and initial resource commitment.",
    keyActivities: [
      "Capture Questions submission",
      "LOB Bid/No-Bid decision",
      "Pursuit Lead assignment",
      "Initial customer engagement plan"
    ],
    owner: "Pursuit Lead",
    icon: <ClipboardCheck className="w-6 h-6" />,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30"
  },
  {
    id: 3,
    phase: "Target",
    title: "Shaping & Engagement",
    description: "Shape the opportunity through customer engagement and competitive positioning activities.",
    keyActivities: [
      "Customer engagement execution",
      "Competitive intelligence gathering",
      "Teaming partner identification",
      "Solution concept development"
    ],
    owner: "Pursuit Lead",
    icon: <Target className="w-6 h-6" />,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-300"
  },
  {
    id: 4,
    phase: "Gate 2",
    title: "Capture Ownership",
    description: "Formal capture ownership transition with refined competitive strategy and solution.",
    keyActivities: [
      "Capture Kickoff meeting",
      "Capabilities Matrix completion",
      "Teaming Plan finalization",
      "Cross-functional review approval"
    ],
    owner: "Capture Manager",
    icon: <Users className="w-6 h-6" />,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30"
  },
  {
    id: 5,
    phase: "Capture",
    title: "Solution Development",
    description: "Refine solution, finalize teams, validate pricing, and prepare for proposal commitment.",
    keyActivities: [
      "Draft RFP analysis",
      "Solution architecture refinement",
      "Pricing strategy development",
      "B&P resource planning"
    ],
    owner: "Capture Manager",
    icon: <Lightbulb className="w-6 h-6" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-300"
  },
  {
    id: 6,
    phase: "Gate 3",
    title: "Proposal Commitment",
    description: "Final leadership approval to commit resources and proceed to proposal development.",
    keyActivities: [
      "Final Bid/No-Bid decision",
      "GovDash Final completion",
      "Draft narrative submission",
      "Pricing authorization"
    ],
    owner: "Capture Manager",
    icon: <FileCheck className="w-6 h-6" />,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30"
  }
];

const decisionOutcomes = [
  {
    label: "Bid",
    description: "Proceed to next phase",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-300"
  },
  {
    label: "Hold",
    description: "Await more information",
    icon: <ClipboardCheck className="w-4 h-4" />,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-300"
  },
  {
    label: "No-Bid",
    description: "Opportunity closed",
    icon: <XCircle className="w-4 h-4" />,
    color: "text-red-600",
    bgColor: "bg-red-100",
    borderColor: "border-red-300"
  }
];

export default function OpportunityLifecycleVisual() {
  return (
    <Card className="w-full" data-testid="flowchart-opportunity-lifecycle">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Albers Opportunity Lifecycle</CardTitle>
            <CardDescription>
              End-to-end process from discovery through Gate 3 proposal commitment
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Timeline Visual */}
        <div className="relative">
          {/* Horizontal flow for larger screens */}
          <div className="hidden lg:block">
            {/* Connection line */}
            <div className="absolute top-16 left-8 right-8 h-1 bg-gradient-to-r from-blue-300 via-primary/40 to-emerald-300 rounded-full" />
            
            {/* Stages */}
            <div className="grid grid-cols-6 gap-2">
              {lifecycleStages.map((stage, index) => (
                <div key={stage.id} className="relative flex flex-col items-center">
                  {/* Icon circle */}
                  <div className={`relative z-10 w-12 h-12 rounded-full ${stage.bgColor} ${stage.borderColor} border-2 flex items-center justify-center ${stage.color} shadow-sm`}>
                    {stage.icon}
                  </div>
                  
                  {/* Phase label */}
                  <div className="mt-3 text-center">
                    <span className={`text-xs font-bold ${stage.color}`}>
                      {stage.phase}
                    </span>
                  </div>
                  
                  {/* Title */}
                  <p className="mt-1 text-xs font-semibold text-center leading-tight">
                    {stage.title}
                  </p>
                  
                  {/* Owner */}
                  <p className="mt-1 text-[10px] text-muted-foreground text-center">
                    {stage.owner}
                  </p>
                  
                  {/* Arrow (except last) */}
                  {index < lifecycleStages.length - 1 && (
                    <ArrowRight className="absolute -right-1 top-4 w-4 h-4 text-muted-foreground/50" />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Vertical flow for mobile/tablet */}
          <div className="lg:hidden space-y-4">
            {lifecycleStages.map((stage, index) => (
              <div key={stage.id} className="relative">
                {/* Connection line */}
                {index < lifecycleStages.length - 1 && (
                  <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-gradient-to-b from-current to-muted-foreground/20" style={{ color: 'var(--primary)' }} />
                )}
                
                <div className={`flex gap-4 p-4 rounded-lg ${stage.bgColor} ${stage.borderColor} border`}>
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center ${stage.color} shadow-sm flex-shrink-0`}>
                    {stage.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${stage.color} px-2 py-0.5 bg-white rounded`}>
                        {stage.phase}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {stage.owner}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm mt-1">{stage.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Detailed breakdown */}
        <div className="mt-8 pt-6 border-t">
          <h3 className="font-semibold text-lg mb-4">Stage Details</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lifecycleStages.map((stage) => (
              <div 
                key={stage.id} 
                className={`p-4 rounded-lg ${stage.bgColor} ${stage.borderColor} border`}
                data-testid={`opportunity-stage-${stage.id}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`${stage.color}`}>{stage.icon}</div>
                  <span className={`text-xs font-bold ${stage.color}`}>{stage.phase}</span>
                </div>
                <h4 className="font-semibold text-sm mb-2">{stage.title}</h4>
                <ul className="space-y-1">
                  {stage.keyActivities.map((activity, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className={`mt-1.5 w-1 h-1 rounded-full ${stage.color.replace('text-', 'bg-')} flex-shrink-0`} />
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        
        {/* Gate Decision Outcomes */}
        <div className="mt-6 pt-4 border-t">
          <h3 className="font-semibold text-sm mb-3">Gate Decision Outcomes</h3>
          <div className="flex flex-wrap gap-4">
            {decisionOutcomes.map((outcome) => (
              <div 
                key={outcome.label}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${outcome.bgColor} ${outcome.borderColor} border`}
              >
                <div className={outcome.color}>{outcome.icon}</div>
                <div>
                  <span className={`text-xs font-bold ${outcome.color}`}>{outcome.label}</span>
                  <p className="text-[10px] text-muted-foreground">{outcome.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>Decision Gates (Leadership Review)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Business Development</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Target Phase</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Capture Phase</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
