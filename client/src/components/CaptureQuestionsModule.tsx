import { useState, useMemo, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Send, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CaptureQuestionCard from "./CaptureQuestionCard";
import SolicitationInfoForm from "./SolicitationInfoForm";

interface Question {
  question: string;
  example?: string;
}

interface PhaseQuestions {
  phase: string;
  sections?: { title: string; questions: Question[] }[];
  questions?: Question[];
}

const captureData: PhaseQuestions[] = [
  {
    phase: "Analysis",
    sections: [
      {
        title: "Budget/Competition/Scope",
        questions: [
          {
            question: "What is the customer's budget?",
            example: "The funding originates from a federal grant capped at $3 million, earmarked for improving cybersecurity infrastructure."
          },
          {
            question: "What companies are critical?",
            example: "The incumbent contractor, ABC Solutions, currently manages the system and is likely to be a key competitor."
          },
          {
            question: "Are there changes to the scope of work?",
            example: "The revised SOW removes on-site support requirements, transitioning to a fully remote service delivery model."
          }
        ]
      }
    ]
  },
  {
    phase: "Intel",
    sections: [
      {
        title: "Stakeholders",
        questions: [
          {
            question: "Who are the decision makers?",
            example: "The decision makers include the procurement officer, the IT director, and the CFO."
          },
          {
            question: "Who is paying for this?",
            example: "This initiative is funded by a DoD contract with payments managed by DFAS."
          },
          {
            question: "Who are the end users?",
            example: "The primary users are field technicians utilizing the system for real-time updates."
          }
        ]
      },
      {
        title: "Motivation",
        questions: [
          {
            question: "Why is this being procured?",
            example: "To replace outdated legacy systems and enhance operational efficiency."
          },
          {
            question: "Why is this a priority for the organization?",
            example: "It supports goals in their five-year modernization plan."
          },
          {
            question: "Why is the current solution not working?",
            example: "System outages and unsupported technology cause delays and maintenance costs."
          },
          {
            question: "Why is this a priority for the decision maker?",
            example: "They are under pressure to meet performance targets tied to federal funding."
          },
          {
            question: "What are the challenges?",
            example: "Migrating data from legacy systems without disrupting operations."
          }
        ]
      },
      {
        title: "Requirements",
        questions: [
          {
            question: "What are the key personnel requirements?",
            example: "Certified project manager (PMP) with 10+ years of federal experience."
          },
          {
            question: "What vehicle is being used?",
            example: "This project is using a BPA under an existing IDIQ framework."
          },
          {
            question: "What tools are they using?",
            example: "Jira and Confluence for tracking, Tableau for analytics."
          }
        ]
      },
      {
        title: "Assessments",
        questions: [
          {
            question: "Why should we bid?",
            example: "Strong past performance and aligned core capabilities."
          },
          {
            question: "Why should we not bid?",
            example: "Short timeline and unavailable cleared personnel."
          }
        ]
      }
    ]
  },
  {
    phase: "Solution",
    sections: [
      {
        title: "General",
        questions: [
          {
            question: "Describe the win theme(s) we want to write to",
            example: "Innovation, low risk, past performance, rapid deployment capability."
          },
          {
            question: "Provide any other information that may be useful for generating a response",
            example: "508 compliance required, rapid mobilization capability available."
          },
          {
            question: "List our teaming partners for this bid and what their roles will be",
            example: "ABC Technologies: provides hardware and software solutions."
          }
        ]
      },
      {
        title: "Approach",
        questions: [
          {
            question: "What is the level of effort?",
            example: "Team of 5 full-time personnel over 6 months."
          },
          {
            question: "What is the pricing strategy?",
            example: "Fixed-price for transparency and scope flexibility."
          },
          {
            question: "How will we implement this solution?",
            example: "Dedicated team, comprehensive assessment, training, and rollout."
          },
          {
            question: "What actions are required by the customer?",
            example: "Allocate internal testing resources and identify key decision-makers."
          },
          {
            question: "How will lines of communication be handled?",
            example: "Weekly meetings, project portal, and a single POC."
          },
          {
            question: "What are they hoping to achieve?",
            example: "Operational efficiency, compliance, scalability."
          }
        ]
      },
      {
        title: "Management",
        questions: [
          {
            question: "What is our management approach?",
            example: "Agile approach with continuous improvement."
          },
          {
            question: "How will we monitor quality?",
            example: "QA plan with KPIs and regular audits."
          },
          {
            question: "Who will be leading this project?",
            example: "Experienced PM with domain expertise."
          },
          {
            question: "Who are the key personnel?",
            example: "PM, architect, developer, QA specialist, client liaison."
          }
        ]
      },
      {
        title: "Benefits",
        questions: [
          {
            question: "How do we make the decision makers look good?",
            example: "Executive dashboards and public recognition opportunities."
          },
          {
            question: "How will we improve the lives of end users?",
            example: "Faster decision-making, intuitive interfaces, less manual effort."
          },
          {
            question: "What are the anticipated savings?",
            example: "20% cost savings via automation, $500K in infrastructure reuse."
          },
          {
            question: "What benefits will the customer experience?",
            example: "Improved data security, performance, and scalability."
          }
        ]
      },
      {
        title: "Features",
        questions: [
          {
            question: "How do we do better than the competition?",
            example: "Higher certification count and better on-time delivery rates."
          },
          {
            question: "How is our solution tailored to the customer's needs?",
            example: "Phased implementation and enhanced security per customer request."
          },
          {
            question: "What does the ideal end state look like for us?",
            example: "A scalable framework replicable for future bids."
          },
          {
            question: "What does the ideal end state look like for the customer?",
            example: "50% onboarding reduction, 25% growth support without more investment."
          }
        ]
      },
      {
        title: "Risks",
        questions: [
          {
            question: "What are the risks?",
            example: "Third-party delays, stakeholder misalignment."
          },
          {
            question: "How will we mitigate risks?",
            example: "Testing phases and SLAs with vendors."
          },
          {
            question: "What is our solution dependent on?",
            example: "Legacy system access and third-party licenses."
          },
          {
            question: "What happens if dependencies are unavailable?",
            example: "Shift to testing/training or use open-source alternatives."
          },
          {
            question: "What does our solution assume?",
            example: "Secure network infrastructure and timely customer approvals."
          }
        ]
      }
    ]
  }
];

interface CaptureQuestionsModuleProps {
  onFormDataChange?: (data: Record<string, any>) => void;
}

const STORAGE_KEY = 'captureQuestions_draft';

export default function CaptureQuestionsModule({ onFormDataChange }: CaptureQuestionsModuleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Solicitation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [formKey, setFormKey] = useState(0); // Key to force form remount when clearing
  const { toast } = useToast();
  
  // Track solicitation info
  const [solicitationInfo, setSolicitationInfo] = useState<Record<string, any>>({});
  
  // Track all question responses
  const [analysisAnswers, setAnalysisAnswers] = useState<Record<string, string>>({});
  const [intelAnswers, setIntelAnswers] = useState<Record<string, string>>({});
  const [solutionAnswers, setSolutionAnswers] = useState<Record<string, string>>({});

  // Load saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.solicitationInfo) setSolicitationInfo(data.solicitationInfo);
        if (data.analysisAnswers) setAnalysisAnswers(data.analysisAnswers);
        if (data.intelAnswers) setIntelAnswers(data.intelAnswers);
        if (data.solutionAnswers) setSolutionAnswers(data.solutionAnswers);
        if (data.lastSaved) setLastSaved(new Date(data.lastSaved));
        
        toast({
          title: "Draft Restored",
          description: "Your previous work has been restored.",
        });
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
          solicitationInfo,
          analysisAnswers,
          intelAnswers,
          solutionAnswers,
          lastSaved: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
        setLastSaved(new Date());
      } catch (error) {
        console.error("Error saving draft:", error);
      }
    }, 1000); // Debounce: save 1 second after user stops typing

    return () => clearTimeout(timeoutId);
  }, [solicitationInfo, analysisAnswers, intelAnswers, solutionAnswers]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSolicitationInfo({});
      setAnalysisAnswers({});
      setIntelAnswers({});
      setSolutionAnswers({});
      setLastSaved(null);
      setFormKey(prev => prev + 1); // Force form remount
      
      toast({
        title: "Draft Cleared",
        description: "All saved work has been cleared.",
      });
    } catch (error) {
      console.error("Error clearing draft:", error);
    }
  }, [toast]);

  // Calculate total questions and answered questions
  const totalQuestions = useMemo(() => {
    let count = 0;
    
    // Count solicitation info fields (excluding notes which is optional)
    count += 10; // All required solicitation fields
    
    // Count all capture questions
    captureData.forEach(phase => {
      if (phase.sections) {
        phase.sections.forEach(section => {
          count += section.questions.length;
        });
      } else if (phase.questions) {
        count += phase.questions.length;
      }
    });
    
    return count;
  }, []);

  const answeredQuestions = useMemo(() => {
    let count = 0;
    
    // Count filled solicitation fields
    const requiredSolicitationFields = [
      'solicitationName', 'solicitationNumber', 'solicitationType', 
      'customer', 'publicationDate', 'dueDate', 'periodOfPerformance', 
      'budget', 'captureManager', 'customerContact'
    ];
    count += requiredSolicitationFields.filter(field => solicitationInfo[field]).length;
    
    // Count answered questions
    count += Object.values(analysisAnswers).filter(answer => answer?.trim()).length;
    count += Object.values(intelAnswers).filter(answer => answer?.trim()).length;
    count += Object.values(solutionAnswers).filter(answer => answer?.trim()).length;
    
    return count;
  }, [solicitationInfo, analysisAnswers, intelAnswers, solutionAnswers]);

  const completionPercentage = useMemo(() => {
    return Math.round((answeredQuestions / totalQuestions) * 100);
  }, [answeredQuestions, totalQuestions]);

  const canSubmit = completionPercentage >= 100;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast({
        title: "Cannot Submit",
        description: "Capture questions must be 100% complete before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/capture-questions/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          solicitationInfo,
          analysisAnswers,
          intelAnswers,
          solutionAnswers,
          completionPercentage
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to submit';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      await response.json();

      // Clear the saved draft and reset all form state after successful submission
      localStorage.removeItem(STORAGE_KEY);
      setLastSaved(null);
      
      // Reset all form fields
      setSolicitationInfo({});
      setAnalysisAnswers({});
      setIntelAnswers({});
      setSolutionAnswers({});
      setFormKey(prev => prev + 1); // Force form remount to clear SolicitationInfoForm

      toast({
        title: "Success!",
        description: "Capture questions submitted to Proposal Team.",
      });
    } catch (error) {
      console.error('Error submitting capture questions:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit capture questions.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="module-capture-questions">
      <div className="p-4 sm:p-6 border-b border-border">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <h2 className="text-lg sm:text-xl font-semibold">Capture Questions</h2>
            <div className="sm:ml-auto flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="text-xs sm:text-sm text-muted-foreground">
                Completion: <span className={`font-medium ${canSubmit ? 'text-green-600 dark:text-green-500' : 'text-foreground'}`}>
                  {completionPercentage}%
                </span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={clearDraft}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  data-testid="button-clear-draft"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Draft
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className="bg-primary hover:bg-primary/90 flex-1 sm:flex-none"
                  data-testid="button-submit-to-proposal"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </div>
          </div>
          
          {lastSaved && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Save className="w-3 h-3" />
              <span>Auto-saved {new Date(lastSaved).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm"
            data-testid="input-search-questions"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-border px-3 sm:px-6 overflow-x-auto scrollbar-hide">
          <TabsList className="bg-transparent h-auto p-0 gap-3 sm:gap-6">
            <TabsTrigger
              value="Solicitation"
              className="bg-transparent data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-3"
              data-testid="tab-solicitation"
            >
              Solicitation Info
            </TabsTrigger>
            {captureData.map((phase) => (
              <TabsTrigger
                key={phase.phase}
                value={phase.phase}
                className="bg-transparent data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-3"
                data-testid={`tab-${phase.phase.toLowerCase()}`}
              >
                {phase.phase}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="Solicitation" className="p-6 pb-32 mt-0">
            <div className="mb-6 p-4 bg-muted/50 border border-border rounded-md">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Note:</span> If a question or field is not applicable to the current opportunity, enter "N/A". Contact Ryan Flood if you have further questions.
              </p>
            </div>
            <SolicitationInfoForm 
              key={formKey}
              onFormDataChange={(data) => {
                setSolicitationInfo(data);
                onFormDataChange?.(data);
              }} 
            />
          </TabsContent>
          
          {captureData.map((phase) => {
            const getAnswerState = (question: string) => {
              if (phase.phase === "Analysis") {
                return {
                  value: analysisAnswers[question] || "",
                  onChange: (value: string) => setAnalysisAnswers(prev => ({ ...prev, [question]: value }))
                };
              } else if (phase.phase === "Intel") {
                return {
                  value: intelAnswers[question] || "",
                  onChange: (value: string) => setIntelAnswers(prev => ({ ...prev, [question]: value }))
                };
              } else if (phase.phase === "Solution") {
                return {
                  value: solutionAnswers[question] || "",
                  onChange: (value: string) => setSolutionAnswers(prev => ({ ...prev, [question]: value }))
                };
              }
              return { value: "", onChange: () => {} };
            };

            return (
              <TabsContent key={phase.phase} value={phase.phase} className="p-6 pb-32 space-y-6 mt-0">
                <div className="mb-6 p-4 bg-muted/50 border border-border rounded-md">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Note:</span> If a question or field is not applicable to the current opportunity, enter "N/A". Contact Ryan Flood if you have further questions.
                  </p>
                </div>
                {phase.sections ? (
                  phase.sections.map((section) => (
                    <div key={section.title} className="space-y-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {section.title}
                      </h3>
                      <div className="space-y-3">
                        {section.questions.map((q, idx) => {
                          const answerState = getAnswerState(q.question);
                          return (
                            <CaptureQuestionCard
                              key={idx}
                              question={q.question}
                              example={q.example}
                              response={answerState.value}
                              onResponseChange={answerState.onChange}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-3">
                    {phase.questions?.map((q, idx) => {
                      const answerState = getAnswerState(q.question);
                      return (
                        <CaptureQuestionCard
                          key={idx}
                          question={q.question}
                          example={q.example}
                          response={answerState.value}
                          onResponseChange={answerState.onChange}
                        />
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </div>
      </Tabs>
    </div>
  );
}
