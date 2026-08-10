import { sanitizeHtml } from "@/lib/sanitize";
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import heroImage from "@assets/image_1765568322331.png";
import PDFViewer from "@/components/PDFViewer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  Plus, 
  Calendar, 
  MapPin, 
  User, 
  Users, 
  FileText, 
  Send,
  ChevronDown,
  ChevronUp,
  Upload,
  X,
  Image,
  AlertTriangle,
  Loader2,
  Pencil,
  Trash2,
  FileUp,
  CheckCircle,
  Sparkles,
  CalendarDays
} from "lucide-react";

const tripReportSchema = z.object({
  eventName: z.string().min(1, "Event name is required"),
  dateStart: z.string().min(1, "Start date is required"),
  dateEnd: z.string().min(1, "End date is required"),
  location: z.string().min(1, "Location is required"),
  albersPoc: z.string().min(1, "Albers POC is required"),
  otherAttendees: z.string().optional(),
  justification: z.string().min(1, "Justification is required"),
  isAttendee: z.boolean().default(false),
  isSponsor: z.boolean().default(false),
  isPanelist: z.boolean().default(false),
  importanceSummary: z.string().min(1, "Importance summary is required"),
  meetingsSummary: z.string().min(1, "Meetings summary is required"),
  sponsorshipSummary: z.string().optional(),
  marketingNeeds: z.string().optional(),
  recommendations: z.string().min(1, "Recommendations are required"),
  shouldReturn: z.boolean().default(true),
  returnType: z.string().optional(),
});

type TripReportFormData = z.infer<typeof tripReportSchema>;

interface TripReport {
  id: string;
  sourceType: 'form' | 'document';
  originalFileUrl: string | null;
  originalFileName: string | null;
  cleanedHtml: string | null;
  extractedPlaintext: string | null;
  eventName: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  location: string | null;
  albersPoc: string | null;
  otherAttendees: string | null;
  justification: string | null;
  isAttendee: boolean;
  isSponsor: boolean;
  isPanelist: boolean;
  importanceSummary: string | null;
  meetingsSummary: string | null;
  sponsorshipSummary: string | null;
  marketingNeeds: string | null;
  recommendations: string | null;
  shouldReturn: boolean;
  returnType: string | null;
  aiSummary: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  authorFirstName: string | null;
  authorLastName: string | null;
  authorEmail: string;
  photos?: { id: string; fileUrl: string; fileName: string; uploadedAt: string }[];
}

interface UploadedDocumentData {
  originalFileUrl: string;
  previewUrl?: string; // Direct signed URL for immediate preview
  originalFileName: string;
  cleanedHtml: string | null;
  extractedPlaintext: string;
  metadata: {
    eventName?: string;
    dateStart?: string;
    dateEnd?: string;
    location?: string;
    otherAttendees?: string;
  };
  extractedPhotos: { url: string; name: string }[];
}

interface IndustryEvent {
  id: string;
  showName: string;
  vertical: string | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function TripReports() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("view");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<TripReport | null>(null);
  const [editingReport, setEditingReport] = useState<TripReport | null>(null);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [uploadedPhotos, setUploadedPhotos] = useState<{ url: string; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<UploadedDocumentData | null>(null);
  const [showDocPreviewDialog, setShowDocPreviewDialog] = useState(false);
  
  // Event management state
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<IndustryEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    showName: "",
    vertical: "",
    startDate: "",
    endDate: "",
    location: "",
  });

  const form = useForm<TripReportFormData>({
    resolver: zodResolver(tripReportSchema),
    defaultValues: {
      eventName: "",
      dateStart: "",
      dateEnd: "",
      location: "",
      albersPoc: "",
      otherAttendees: "",
      justification: "",
      isAttendee: false,
      isSponsor: false,
      isPanelist: false,
      importanceSummary: "",
      meetingsSummary: "",
      sponsorshipSummary: "",
      marketingNeeds: "",
      recommendations: "",
      shouldReturn: true,
      returnType: "",
    },
  });

  const { data: reports, isLoading } = useQuery<TripReport[]>({
    queryKey: ['/api/trip-reports', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      const response = await fetch(`/api/trip-reports?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch trip reports');
      return response.json();
    },
  });

  const { data: reportDetail } = useQuery<TripReport>({
    queryKey: ['/api/trip-reports', selectedReport?.id],
    queryFn: async () => {
      const response = await fetch(`/api/trip-reports/${selectedReport!.id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch trip report');
      return response.json();
    },
    enabled: !!selectedReport?.id,
  });

  // Industry Events query
  const { data: industryEvents, isLoading: isLoadingEvents } = useQuery<IndustryEvent[]>({
    queryKey: ['/api/industry-events'],
  });

  // Event mutations
  const createEventMutation = useMutation({
    mutationFn: async (data: typeof eventForm) => {
      return apiRequest('POST', '/api/industry-events', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/industry-events'] });
      setShowEventDialog(false);
      resetEventForm();
      toast({ title: "Event added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add event", variant: "destructive" });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...data }: typeof eventForm & { id: string }) => {
      return apiRequest('PUT', `/api/industry-events/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/industry-events'] });
      setShowEventDialog(false);
      setEditingEvent(null);
      resetEventForm();
      toast({ title: "Event updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update event", variant: "destructive" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/industry-events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/industry-events'] });
      toast({ title: "Event deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete event", variant: "destructive" });
    },
  });

  const resetEventForm = () => {
    setEventForm({ showName: "", vertical: "", startDate: "", endDate: "", location: "" });
  };

  const handleEditEvent = (event: IndustryEvent) => {
    setEditingEvent(event);
    setEventForm({
      showName: event.showName,
      vertical: event.vertical || "",
      startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : "",
      endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : "",
      location: event.location || "",
    });
    setShowEventDialog(true);
  };

  const handleSubmitEvent = () => {
    if (!eventForm.showName.trim()) {
      toast({ title: "Show name is required", variant: "destructive" });
      return;
    }
    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, ...eventForm });
    } else {
      createEventMutation.mutate(eventForm);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: TripReportFormData & { photoUrls?: { url: string; name: string }[] }) => {
      return apiRequest('POST', '/api/trip-reports', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trip-reports'] });
      form.reset();
      setUploadedPhotos([]);
      setActiveTab("view");
      toast({
        title: "Trip Report Submitted",
        description: "Your trip report has been submitted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit trip report",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/trip-reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trip-reports'] });
      toast({
        title: "Trip Report Deleted",
        description: "The trip report has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete trip report",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TripReportFormData & { id: string }) => {
      const { id, ...updateData } = data;
      return apiRequest('PUT', `/api/trip-reports/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trip-reports'] });
      form.reset();
      setEditingReport(null);
      setUploadedPhotos([]);
      setActiveTab("view");
      toast({
        title: "Trip Report Updated",
        description: "Your trip report has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update trip report",
        variant: "destructive",
      });
    },
  });

  const handleEditReport = (report: TripReport) => {
    setEditingReport(report);
    form.reset({
      eventName: report.eventName || "",
      dateStart: report.dateStart || "",
      dateEnd: report.dateEnd || "",
      location: report.location || "",
      albersPoc: report.albersPoc || "",
      otherAttendees: report.otherAttendees || "",
      justification: report.justification || "",
      isAttendee: report.isAttendee,
      isSponsor: report.isSponsor,
      isPanelist: report.isPanelist,
      importanceSummary: report.importanceSummary || "",
      meetingsSummary: report.meetingsSummary || "",
      sponsorshipSummary: report.sponsorshipSummary || "",
      marketingNeeds: report.marketingNeeds || "",
      recommendations: report.recommendations || "",
      shouldReturn: report.shouldReturn,
      returnType: report.returnType || "",
    });
    setActiveTab("submit");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch('/api/trip-reports/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        
        if (response.ok) {
          const result = await response.json();
          setUploadedPhotos(prev => [...prev, { url: result.url, name: result.name }]);
        } else {
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${file.name}`,
            variant: "destructive",
          });
        }
      } catch {
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive",
        });
      }
    }
    
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file. You can save Word documents as PDF using 'Save As' or 'Export'.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingDoc(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/trip-reports/upload-document', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload document');
      }

      const result = await response.json();
      setUploadedDocument(result.data);
      setShowDocPreviewDialog(true);
      toast({
        title: "Document Uploaded",
        description: result.message || "Review the document before submitting",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setIsUploadingDoc(false);
      if (docInputRef.current) {
        docInputRef.current.value = '';
      }
    }
  };

  const submitDocumentReport = async () => {
    if (!uploadedDocument) return;

    try {
      await createMutation.mutateAsync({
        sourceType: 'document',
        originalFileUrl: uploadedDocument.originalFileUrl,
        originalFileName: uploadedDocument.originalFileName,
        cleanedHtml: uploadedDocument.cleanedHtml,
        extractedPlaintext: uploadedDocument.extractedPlaintext,
        eventName: uploadedDocument.metadata.eventName || uploadedDocument.originalFileName,
        dateStart: uploadedDocument.metadata.dateStart || new Date().toISOString().split('T')[0],
        dateEnd: uploadedDocument.metadata.dateEnd || new Date().toISOString().split('T')[0],
        location: uploadedDocument.metadata.location || '',
        albersPoc: '',
        otherAttendees: uploadedDocument.metadata.otherAttendees || '',
        photoUrls: uploadedDocument.extractedPhotos.length > 0 ? uploadedDocument.extractedPhotos : undefined,
      } as any);
      
      setShowDocPreviewDialog(false);
      setUploadedDocument(null);
    } catch (error) {
      console.error('Error submitting document report:', error);
    }
  };

  const onSubmit = (data: TripReportFormData) => {
    if (editingReport) {
      updateMutation.mutate({
        ...data,
        id: editingReport.id,
      });
    } else {
      createMutation.mutate({
        ...data,
        photoUrls: uploadedPhotos.length > 0 ? uploadedPhotos : undefined,
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingReport(null);
    form.reset();
    setActiveTab("view");
  };

  const toggleExpanded = (id: string) => {
    setExpandedReports(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDateRange = (start: string, end: string) => {
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    } catch {
      return `${start} - ${end}`;
    }
  };

  return (
    <div className="flex-1 overflow-auto pb-24">
      {/* Hero Header */}
      <div className="relative h-48 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#51142a]/85 via-[#51142a]/70 to-[#0E2841]/60" />
        <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-8">
          <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">Trip Reports</h1>
          <p className="text-white/90 mt-2 max-w-2xl">Post-event forms for conferences, meetings, and business travel</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="view" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-foreground" data-testid="tab-view-reports">View Reports</TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-foreground" data-testid="tab-events">
              <CalendarDays className="w-4 h-4 mr-2" />
              Upcoming Events
            </TabsTrigger>
            <TabsTrigger value="submit" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-foreground" data-testid="tab-submit-report">Submit Report</TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by event, location, attendee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-reports"
                />
              </div>
              <input
                type="file"
                ref={docInputRef}
                onChange={handleDocumentUpload}
                accept=".pdf,application/pdf"
                className="hidden"
                data-testid="input-plaud-doc"
              />
              <Button
                variant="outline"
                onClick={() => docInputRef.current?.click()}
                disabled={isUploadingDoc}
                data-testid="button-upload-plaud"
                data-goatcounter-click="trip-upload-pdf"
                data-goatcounter-title="Upload PDF trip report"
              >
                {isUploadingDoc ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileUp className="w-4 h-4 mr-2" />
                )}
                {isUploadingDoc ? "Uploading..." : "Upload PDF"}
              </Button>
              <Button
                onClick={() => setActiveTab("submit")}
                data-testid="button-new-report"
                data-goatcounter-click="trip-new-report"
                data-goatcounter-title="Create new trip report"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Report
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-1/3 mb-2" />
                      <Skeleton className="h-4 w-1/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : reports && reports.length > 0 ? (
              <div className="space-y-3">
                {reports.map((report) => (
                  <Collapsible
                    key={report.id}
                    open={expandedReports.has(report.id)}
                    onOpenChange={() => toggleExpanded(report.id)}
                  >
                    <Card className="overflow-hidden" data-testid={`card-report-${report.id}`}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover-elevate p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <CardTitle className="text-lg flex items-center gap-2">
                                {report.eventName || report.originalFileName || "Untitled Report"}
                                {expandedReports.has(report.id) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </CardTitle>
                              <CardDescription className="flex flex-wrap items-center gap-3 mt-1">
                                {report.sourceType === 'document' ? (
                                  <Badge variant="outline" className="text-xs">
                                    <FileText className="w-3 h-3 mr-1" />
                                    Document
                                  </Badge>
                                ) : null}
                                {report.dateStart && report.dateEnd && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDateRange(report.dateStart, report.dateEnd)}
                                  </span>
                                )}
                                {report.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {report.location}
                                  </span>
                                )}
                                {report.albersPoc && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {report.albersPoc}
                                  </span>
                                )}
                              </CardDescription>
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                                {report.aiSummary ? (
                                  <span className="flex items-start gap-1">
                                    <Sparkles className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                                    <span>{report.aiSummary}</span>
                                  </span>
                                ) : (
                                  report.sourceType === 'document' && report.extractedPlaintext
                                    ? report.extractedPlaintext.slice(0, 200) + "..."
                                    : (report.importanceSummary || "No summary available")
                                )}
                              </p>
                            </div>
                            <div className="flex gap-1 flex-wrap">
                              {report.isAttendee && <Badge variant="outline" className="border-primary text-foreground">Attendee</Badge>}
                              {report.isSponsor && <Badge variant="outline" className="border-primary text-foreground">Sponsor</Badge>}
                              {report.isPanelist && <Badge variant="outline" className="border-primary text-foreground">Panelist</Badge>}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 pb-4 px-4 space-y-4">
                          <Separator />
                          
                          {/* Document-based report - show embedded PDF viewer or fallback to HTML for legacy */}
                          {report.sourceType === 'document' && report.originalFileUrl && report.originalFileName?.toLowerCase().endsWith('.pdf') ? (
                            <>
                              <div className="rounded-lg border overflow-hidden" style={{ maxHeight: "600px" }}>
                                <PDFViewer 
                                  url={report.originalFileUrl}
                                  className="h-full"
                                />
                              </div>
                              {report.originalFileUrl && (
                                <a 
                                  href={report.originalFileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline flex items-center gap-1"
                                >
                                  <FileText className="w-4 h-4" />
                                  Download Original Document
                                </a>
                              )}
                            </>
                          ) : report.sourceType === 'document' && report.cleanedHtml ? (
                            <>
                              {/* Legacy DOCX-based report - show HTML content */}
                              <div 
                                className="prose prose-sm dark:prose-invert max-w-none p-4 bg-card border rounded-lg trip-report-content"
                                dangerouslySetInnerHTML={sanitizeHtml(report.cleanedHtml)}
                              />
                              {report.originalFileUrl && (
                                <a 
                                  href={report.originalFileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline flex items-center gap-1"
                                >
                                  <FileText className="w-4 h-4" />
                                  Download Original Document
                                </a>
                              )}
                            </>
                          ) : (
                            <>
                              {/* Form-based report - show structured fields */}
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <h4 className="font-medium text-sm mb-1">Other Attendees</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {report.otherAttendees || "None specified"}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="font-medium text-sm mb-1">Justification</h4>
                                  <p className="text-sm text-muted-foreground">{report.justification || "Not specified"}</p>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium text-sm mb-1">Importance of Attendance</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {report.importanceSummary || "Not specified"}
                                </p>
                              </div>

                              <div>
                                <h4 className="font-medium text-sm mb-1">Who We Met With</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {report.meetingsSummary || "Not specified"}
                                </p>
                              </div>

                              {report.sponsorshipSummary && (
                                <div>
                                  <h4 className="font-medium text-sm mb-1">Sponsorship Visibility</h4>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {report.sponsorshipSummary}
                                  </p>
                                </div>
                              )}

                              {report.marketingNeeds && (
                                <div>
                                  <h4 className="font-medium text-sm mb-1">Marketing/CRM Needs</h4>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {report.marketingNeeds}
                                  </p>
                                </div>
                              )}

                              {report.recommendations && (
                                <div>
                                  <h4 className="font-medium text-sm mb-1">Recommendations for Next Year</h4>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {report.recommendations}
                                  </p>
                                  {report.shouldReturn && (
                                    <Badge variant="outline" className="mt-2">
                                      Recommended to Return {report.returnType && `(${report.returnType})`}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </>
                          )}

                          <div className="pt-2 border-t flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              Submitted by {report.authorFirstName} {report.authorLastName} on{' '}
                              {format(new Date(report.createdAt), 'MMM d, yyyy')}
                            </p>
                            <div className="flex gap-2">
                              {report.sourceType !== 'document' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleEditReport(report); }}
                                  data-testid={`button-edit-report-${report.id}`}
                                  data-goatcounter-click="trip-edit-report"
                                  data-goatcounter-title="Edit trip report"
                                >
                                  <Pencil className="w-3 h-3 mr-1" /> Edit
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(report.id); }}
                                data-testid={`button-delete-report-${report.id}`}
                                data-goatcounter-click="trip-delete-report"
                                data-goatcounter-title="Delete trip report"
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> Delete
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); toggleExpanded(report.id); }}
                                data-testid={`button-collapse-report-${report.id}`}
                              >
                                <ChevronUp className="w-3 h-3 mr-1" /> Collapse
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg mb-1">No Trip Reports Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? "No reports match your search criteria." 
                      : "Be the first to submit a trip report!"}
                  </p>
                  <Button
                    onClick={() => setActiveTab("submit")}
                    data-testid="button-submit-first-report"
                    data-goatcounter-click="trip-submit-first"
                    data-goatcounter-title="Submit first trip report"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Submit Report
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Upcoming Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="w-5 h-5" />
                      Industry Events Calendar
                    </CardTitle>
                    <CardDescription>
                      Upcoming shows, conferences, and trade events
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => { resetEventForm(); setEditingEvent(null); setShowEventDialog(true); }}
                    data-testid="button-add-event"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Event
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingEvents ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : industryEvents && industryEvents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#51142a]">
                          <TableHead className="text-white font-semibold">Show</TableHead>
                          <TableHead className="text-white font-semibold">Vertical</TableHead>
                          <TableHead className="text-white font-semibold">Start Date</TableHead>
                          <TableHead className="text-white font-semibold">End Date</TableHead>
                          <TableHead className="text-white font-semibold">Location</TableHead>
                          <TableHead className="text-white font-semibold w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {industryEvents.map((event, index) => {
                          const eventDate = event.endDate || event.startDate;
                          const isPast = eventDate ? new Date(eventDate) < new Date() : false;
                          return (
                          <TableRow 
                            key={event.id}
                            className={`${index % 2 === 0 ? "bg-background" : "bg-muted/30"} ${isPast ? "text-muted-foreground" : ""}`}
                            data-testid={`row-event-${event.id}`}
                          >
                            <TableCell className={`font-medium ${isPast ? "line-through" : ""}`}>{event.showName}</TableCell>
                            <TableCell className={isPast ? "line-through" : ""}>
                              {event.vertical && (
                                <Badge variant="outline" className={`text-xs ${isPast ? "line-through opacity-60" : ""}`}>
                                  {event.vertical}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className={isPast ? "line-through" : ""}>
                              {event.startDate ? format(new Date(event.startDate), 'M/d/yyyy') : '-'}
                            </TableCell>
                            <TableCell className={isPast ? "line-through" : ""}>
                              {event.endDate ? format(new Date(event.endDate), 'M/d/yyyy') : '-'}
                            </TableCell>
                            <TableCell className={isPast ? "line-through" : ""}>{event.location || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleEditEvent(event)}
                                  data-testid={`button-edit-event-${event.id}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm('Delete this event?')) {
                                      deleteEventMutation.mutate(event.id);
                                    }
                                  }}
                                  data-testid={`button-delete-event-${event.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );})}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No upcoming events</p>
                    <p className="text-sm">Click "Add Event" to add your first event.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Event Add/Edit Dialog */}
          <Dialog open={showEventDialog} onOpenChange={(open) => { 
            setShowEventDialog(open); 
            if (!open) { setEditingEvent(null); resetEventForm(); }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
                <DialogDescription>
                  {editingEvent ? 'Update the event details below.' : 'Enter the details for the new event.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Show Name *</label>
                  <Input
                    placeholder="e.g., World Defense Show"
                    value={eventForm.showName}
                    onChange={(e) => setEventForm(prev => ({ ...prev, showName: e.target.value }))}
                    data-testid="input-event-show-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vertical</label>
                  <Input
                    placeholder="e.g., Defense, Industrials, Munitions"
                    value={eventForm.vertical}
                    onChange={(e) => setEventForm(prev => ({ ...prev, vertical: e.target.value }))}
                    data-testid="input-event-vertical"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={eventForm.startDate}
                      onChange={(e) => setEventForm(prev => ({ ...prev, startDate: e.target.value }))}
                      data-testid="input-event-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={eventForm.endDate}
                      onChange={(e) => setEventForm(prev => ({ ...prev, endDate: e.target.value }))}
                      data-testid="input-event-end-date"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    placeholder="e.g., Riyadh, Saudi Arabia"
                    value={eventForm.location}
                    onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                    data-testid="input-event-location"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEventDialog(false)} data-testid="button-cancel-event">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitEvent}
                  disabled={createEventMutation.isPending || updateEventMutation.isPending}
                  data-testid="button-save-event"
                >
                  {(createEventMutation.isPending || updateEventMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingEvent ? 'Update Event' : 'Add Event'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <TabsContent value="submit">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{editingReport ? "Edit Trip Report" : "Post Event Form"}</CardTitle>
                    <CardDescription>
                      {editingReport 
                        ? `Editing: ${editingReport.eventName}`
                        : "Complete this form after attending an event, conference, or business trip"}
                    </CardDescription>
                  </div>
                  {editingReport && (
                    <Button variant="outline" onClick={handleCancelEdit} data-testid="button-cancel-edit">
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Event Details</h3>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="eventName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name of Event *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., MCSS 2024" {...field} data-testid="input-event-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Dallas, TX" {...field} data-testid="input-location" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="dateStart"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date *</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-date-start" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="dateEnd"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date *</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-date-end" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="albersPoc"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Albers POC *</FormLabel>
                              <FormControl>
                                <Input placeholder="Primary point of contact" {...field} data-testid="input-albers-poc" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="otherAttendees"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Other Albers Attendees</FormLabel>
                              <FormControl>
                                <Input placeholder="Comma-separated names" {...field} data-testid="input-other-attendees" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="justification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Justification for Attending *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Explain the purpose and expected value of attending this event"
                                rows={3}
                                {...field}
                                data-testid="input-justification"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex flex-wrap gap-6">
                        <FormField
                          control={form.control}
                          name="isAttendee"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Checkbox 
                                  checked={field.value} 
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-attendee"
                                />
                              </FormControl>
                              <FormLabel className="!mt-0 font-normal">Attendee</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="isSponsor"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Checkbox 
                                  checked={field.value} 
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-sponsor"
                                />
                              </FormControl>
                              <FormLabel className="!mt-0 font-normal">Sponsor</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="isPanelist"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Checkbox 
                                  checked={field.value} 
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-panelist"
                                />
                              </FormControl>
                              <FormLabel className="!mt-0 font-normal">Panelist</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Summary Write-Up</h3>
                      <p className="text-sm text-muted-foreground">
                        This will be used for internal (Team Brief) and external (website/social media) release.
                      </p>

                      <FormField
                        control={form.control}
                        name="importanceSummary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Importance of Attendance & What Was Accomplished *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe why attending this event was important and what was accomplished..."
                                rows={4}
                                {...field}
                                data-testid="input-importance-summary"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="meetingsSummary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Who Did We Meet With (Customers/Partners) *</FormLabel>
                            <FormDescription>
                              Include company names, contacts, and any follow-up actions
                            </FormDescription>
                            <FormControl>
                              <Textarea 
                                placeholder="List all meetings with customers and partners, including names, companies, and outcomes..."
                                rows={6}
                                {...field}
                                data-testid="input-meetings-summary"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sponsorshipSummary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sponsorship Visibility (if applicable)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="If you sponsored, describe how it increased visibility..."
                                rows={3}
                                {...field}
                                data-testid="input-sponsorship-summary"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Marketing/CRM Needs</h3>
                      <FormField
                        control={form.control}
                        name="marketingNeeds"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder="Any marketing or CRM follow-up needs..."
                                rows={3}
                                {...field}
                                data-testid="input-marketing-needs"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Pictures</h3>
                      <div className="border-2 border-dashed rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2 text-amber-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">CUI Warning</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">
                          Do not upload any Controlled Unclassified Information (CUI) or sensitive data.
                        </p>
                        
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          data-testid="input-file-upload"
                        />
                        
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          data-testid="button-upload-photos"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Photos
                            </>
                          )}
                        </Button>

                        {uploadedPhotos.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {uploadedPhotos.map((photo, index) => (
                              <div key={index} className="relative group">
                                <img 
                                  src={photo.url} 
                                  alt={photo.name} 
                                  className="w-20 h-20 object-cover rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={() => removePhoto(index)}
                                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  data-testid={`button-remove-photo-${index}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Recommendations for Next Year</h3>
                      
                      <FormField
                        control={form.control}
                        name="recommendations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Should we return? If so, attend only, sponsor, exhibit? Why? *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Provide your recommendations for next year..."
                                rows={4}
                                {...field}
                                data-testid="input-recommendations"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center gap-4">
                        <FormField
                          control={form.control}
                          name="shouldReturn"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Checkbox 
                                  checked={field.value} 
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-should-return"
                                />
                              </FormControl>
                              <FormLabel className="!mt-0 font-normal">Recommend returning</FormLabel>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="returnType"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input 
                                  placeholder="If returning, how? (Attend, Sponsor, Exhibit...)" 
                                  {...field}
                                  data-testid="input-return-type"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          form.reset();
                          setUploadedPhotos([]);
                          setActiveTab("view");
                        }}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createMutation.isPending}
                        data-testid="button-submit-report"
                      >
                        {createMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Submit Report
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Document Preview Dialog - Shows native formatting */}
      <Dialog open={showDocPreviewDialog} onOpenChange={setShowDocPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              PDF Preview
            </DialogTitle>
            <DialogDescription>
              Review your document before submitting. The original formatting has been preserved.
            </DialogDescription>
          </DialogHeader>
          
          {uploadedDocument && (
            <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
              {/* Metadata section */}
              <div className="flex flex-wrap gap-3 items-center">
                <Badge variant="outline">
                  <FileText className="w-3 h-3 mr-1" />
                  {uploadedDocument.originalFileName}
                </Badge>
                {uploadedDocument.metadata.eventName && (
                  <Badge variant="secondary">{uploadedDocument.metadata.eventName}</Badge>
                )}
                {uploadedDocument.metadata.dateStart && (
                  <Badge variant="outline">
                    <Calendar className="w-3 h-3 mr-1" />
                    {uploadedDocument.metadata.dateStart}
                  </Badge>
                )}
                {uploadedDocument.metadata.location && (
                  <Badge variant="outline">
                    <MapPin className="w-3 h-3 mr-1" />
                    {uploadedDocument.metadata.location}
                  </Badge>
                )}
              </div>

              {/* Extracted photos preview */}
              {uploadedDocument.extractedPhotos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {uploadedDocument.extractedPhotos.map((photo, index) => (
                    <div key={index} className="relative flex-shrink-0 w-24 h-24 rounded-md overflow-hidden border">
                      <img 
                        src={photo.url} 
                        alt={photo.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  <p className="flex items-center text-xs text-muted-foreground">
                    {uploadedDocument.extractedPhotos.length} photo(s) will be attached
                  </p>
                </div>
              )}

              {/* PDF Viewer */}
              <div className="flex-1 border rounded-lg overflow-hidden" style={{ maxHeight: "450px" }}>
                <PDFViewer 
                  url={uploadedDocument.previewUrl || uploadedDocument.originalFileUrl}
                  className="h-full"
                />
              </div>

              {/* Download original link */}
              <div className="flex justify-between items-center">
                <a 
                  href={uploadedDocument.originalFileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <FileText className="w-4 h-4" />
                  Download Original Document
                </a>
                <p className="text-xs text-muted-foreground">
                  This document will be searchable by AI
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDocPreviewDialog(false)} data-testid="button-cancel-preview">
              Cancel
            </Button>
            <Button 
              onClick={submitDocumentReport} 
              disabled={createMutation.isPending}
              data-testid="button-submit-document"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
