import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { newOpportunityFormSchema, type NewOpportunityFormData } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Trash2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { NAICSSelector } from "./NAICSSelector";

const STORAGE_KEY = "newOpportunityForm_draft";

interface FieldConfig {
  name: keyof NewOpportunityFormData;
  label: string;
  type: "text" | "textarea" | "select" | "date" | "checkbox";
  required: boolean;
  options?: string[];
  placeholder?: string;
  fullWidth?: boolean;
}

const fieldConfigs: FieldConfig[] = [
  { name: "oppName", label: "Opp Name", type: "text", required: true },
  { name: "captureManager", label: "Capture Manager", type: "text", required: true },
  { name: "solicitationNumber", label: "Solicitation Number", type: "text", required: false },
  { 
    name: "opportunityType", 
    label: "Opportunity Type", 
    type: "select", 
    required: true,
    options: ["New Business", "Re-compete"]
  },
  { name: "govWinId", label: "GovWin ID #", type: "text", required: false },
  { 
    name: "businessVertical", 
    label: "Business Vertical", 
    type: "select", 
    required: true,
    options: ["Defense", "Industrials", "Advanced Programs"]
  },
  { 
    name: "businessUnit", 
    label: "Business Unit", 
    type: "select", 
    required: true,
    options: [
      "Accident/Amarillo",
      "Technologies",
      "Aviation Services",
      "Balitmore",
      "Connectivity Solutions",
      "Engineering Solutions",
      "Fort Worth",
      "Grand Prairie",
      "Hayden",
      "Lasers",
      "Munitions",
      "Tactical Aircraft Solutions",
      "Tucson"
    ]
  },
  { 
    name: "primeSub", 
    label: "Prime/Sub", 
    type: "select", 
    required: true,
    options: ["Prime", "Subcontractor"]
  },
  { name: "opportunitySummary", label: "Opportunity Summary", type: "textarea", required: true, fullWidth: true },
  { name: "discoverDate", label: "Discover Date", type: "date", required: true },
  { name: "customerName", label: "Customer Name", type: "text", required: true },
  { 
    name: "pursuitPhase", 
    label: "Pursuit Phase", 
    type: "select", 
    required: true,
    options: ["Discover", "Target", "Capture", "Proposal", "Awaiting Award", "Execution"]
  },
  { name: "approxValue", label: "Approx Value", type: "text", required: false, placeholder: "$0.00" },
  { 
    name: "pricingStructure", 
    label: "Pricing Structure", 
    type: "select", 
    required: true,
    options: ["FFP", "CPFF", "T&M", "IDIQ", "UNK"]
  },
  { name: "finalRfpIssueDate", label: "Final RFP Issue Date", type: "date", required: false },
  { name: "finalRfpIsEstimated", label: "Date is Estimated", type: "checkbox", required: false },
  { name: "programDuration", label: "Program Duration", type: "text", required: false },
  { 
    name: "marketplaceSector", 
    label: "Marketplace Sector", 
    type: "select", 
    required: false,
    options: [
      "Aerospace",
      "Air Force",
      "Army",
      "Comm DoD",
      "Comm Int'l",
      "Federal",
      "FMS",
      "Local",
      "Medical",
      "NAVAIR",
      "NAVY",
      "Space",
      "UAS Manned/Unmanned"
    ]
  },
  { name: "solicitationLink", label: "Solicitation Link", type: "text", required: false, placeholder: "https://" },
  { 
    name: "complianceClause", 
    label: "Compliance Clause", 
    type: "select", 
    required: false,
    options: ["FAR 245.204-7012 (USG)", "FAR 252.204-7020 (CUI)", "UNK"]
  },
];

export default function NewOpportunityForm() {
  const { toast } = useToast();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const form = useForm<NewOpportunityFormData>({
    resolver: zodResolver(newOpportunityFormSchema),
    defaultValues: {
      oppName: "",
      captureManager: "",
      solicitationNumber: "",
      opportunityType: undefined,
      govWinId: "",
      businessVertical: undefined,
      businessUnit: undefined,
      primeSub: undefined,
      primeContractorName: "",
      opportunitySummary: "",
      discoverDate: "",
      customerName: "",
      pursuitPhase: undefined,
      approxValue: "",
      naicsCodes: "",
      pricingStructure: undefined,
      finalRfpIssueDate: "",
      finalRfpIsEstimated: false,
      programDuration: "",
      marketplaceSector: undefined,
      solicitationLink: "",
      complianceClause: undefined,
    },
  });

  // Load saved draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsedData = JSON.parse(savedDraft);
        form.reset(parsedData);
        toast({
          title: "Draft Restored",
          description: "Your previous work has been restored.",
        });
      } catch (error) {
        console.error("Error loading draft:", error);
      }
    }
  }, []);

  // Auto-save (debounced) - only save if form has meaningful data
  useEffect(() => {
    const subscription = form.watch((values) => {
      const timeoutId = setTimeout(() => {
        // Only auto-save if at least one field has a value
        const hasData = Object.values(values).some(val => val && val !== "");
        
        if (hasData) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
          setLastSaved(new Date());
        } else {
          // If form is empty, remove any existing draft
          localStorage.removeItem(STORAGE_KEY);
          setLastSaved(null);
        }
      }, 1000);

      return () => clearTimeout(timeoutId);
    });

    return () => subscription.unsubscribe();
  }, [form.watch]);

  const onSubmit = async (data: NewOpportunityFormData) => {
    try {
      // Submit form data to backend
      await apiRequest("POST", "/api/new-opportunity", data);

      toast({
        title: "Success!",
        description: "New opportunity form has been submitted and emailed to the team.",
      });

      // Clear draft after successful submission
      localStorage.removeItem(STORAGE_KEY);
      setLastSaved(null);
      form.reset();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to submit form. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLastSaved(null);
    form.reset();
    toast({
      title: "Draft Cleared",
      description: "All form data has been cleared.",
    });
  };

  const renderField = (config: FieldConfig) => {
    return (
      <FormField
        key={config.name}
        control={form.control}
        name={config.name}
        render={({ field }) => (
          <FormItem className={config.fullWidth ? "md:col-span-2" : ""}>
            <FormLabel>
              {config.label}
              {config.required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
            <FormControl>
              {(() => {
                if (config.type === "text") {
                  return (
                    <Input
                      {...field}
                      value={field.value as string || ""}
                      placeholder={config.placeholder}
                      data-testid={`input-${config.name}`}
                    />
                  );
                }
                if (config.type === "textarea") {
                  return (
                    <Textarea
                      {...field}
                      value={field.value as string || ""}
                      placeholder={config.placeholder}
                      rows={4}
                      data-testid={`textarea-${config.name}`}
                    />
                  );
                }
                if (config.type === "date") {
                  return (
                    <Input
                      {...field}
                      value={field.value as string || ""}
                      type="date"
                      data-testid={`date-${config.name}`}
                    />
                  );
                }
                if (config.type === "select" && config.options) {
                  return (
                    <Select
                      value={field.value as string || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger data-testid={`select-${config.name}`}>
                        <SelectValue placeholder={`Select ${config.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {config.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }
                if (config.type === "checkbox") {
                  return (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={field.value as boolean}
                        onCheckedChange={field.onChange}
                        data-testid={`checkbox-${config.name}`}
                      />
                    </div>
                  );
                }
                return null;
              })()}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Card className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">New Business Opportunity Form</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The opportunity information submitted will be sent to our CRM Manager to be input into our CRM platform.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Complete all required fields marked with <span className="text-destructive">*</span>
          </p>
          {lastSaved && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Save className="w-3 h-3" />
              Auto-saved {format(lastSaved, "h:mm:ss a")}
            </p>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Pricing Structure Reference Table */}
            <Card className="bg-muted/30 border-border">
              <div className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-foreground">Pricing Structure Reference</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-foreground">FFP</span>
                    <p className="text-muted-foreground mt-0.5">Firm Fixed Price - Fixed total price</p>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">CPFF</span>
                    <p className="text-muted-foreground mt-0.5">Cost Plus Fixed Fee - Costs + fixed fee</p>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">T&M</span>
                    <p className="text-muted-foreground mt-0.5">Time & Materials - Hourly rate + materials</p>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">IDIQ</span>
                    <p className="text-muted-foreground mt-0.5">Indefinite Delivery/Indefinite Quantity</p>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">UNK</span>
                    <p className="text-muted-foreground mt-0.5">Unknown - To be determined</p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              {fieldConfigs.map((config) => renderField(config))}
              
              {/* NAICS Code field with searchable selector */}
              <FormField
                control={form.control}
                name="naicsCodes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>
                      NAICS Code(s)
                      <span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <NAICSSelector
                        value={field.value as string || ""}
                        onChange={field.onChange}
                        testId="input-naicsCodes"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Search 150+ aerospace/defense NAICS codes or enter custom codes. Multiple codes can be added.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Conditional Prime Contractor Name field - only shown when Subcontractor is selected */}
              {form.watch("primeSub") === "Subcontractor" && (
                <FormField
                  control={form.control}
                  name="primeContractorName"
                  rules={{
                    required: {
                      value: true,
                      message: "Prime contractor name is required when opportunity is as Subcontractor"
                    },
                    validate: (value) => {
                      const trimmed = (value as string || "").trim();
                      if (!trimmed) {
                        return "Prime contractor name is required when opportunity is as Subcontractor";
                      }
                      return true;
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Prime Contractor Name
                        <span className="text-destructive ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value as string || ""}
                          placeholder="Enter prime contractor name"
                          data-testid="input-primeContractorName"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex gap-3 pt-6 border-t">
              <Button
                type="submit"
                data-testid="button-submit-opportunity"
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Submit Opportunity
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClearDraft}
                data-testid="button-clear-draft"
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear Draft
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
