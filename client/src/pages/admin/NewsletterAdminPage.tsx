import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, FileText, ShieldAlert, BookOpen, Upload, Download, AlertTriangle, Eye, BarChart3, Users, Building2 } from "lucide-react";
import { safeFormatDate } from "@/lib/utils";
import heroImage from "@assets/104050_1765410604628.jpg";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Newsletter {
  id: number;
  division: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  published_at: string;
  is_current: boolean;
  uploaded_by: string;
  created_at: string;
}

interface NewsletterAnalyticsSummary {
  id: string;
  title: string;
  division: string;
  isCurrent: boolean;
  publishedAt: string;
  uniqueViews: number;
  totalViews: number;
}

interface NewsletterAnalyticsDetail {
  uniqueViews: number;
  totalViews: number;
  byDivision: Array<{
    division: string;
    uniqueViews: number;
    totalViews: number;
  }>;
  byUser: Array<{
    userId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    division: string | null;
    viewCount: number;
    lastViewed: string;
  }>;
}

type Division = "corporate" | "defense" | "industrials" | "advanced_programs" | "bou";

const divisionLabels: Record<Division, string> = {
  corporate: "Albers Corporate",
  defense: "Albers Defense",
  industrials: "Albers Industrials",
  advanced_programs: "Albers Advanced Programs",
  bou: "Business Operations Unit",
};

export default function NewsletterAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [selectedNewsletterId, setSelectedNewsletterId] = useState<string | null>(null);
  const [selectedNewsletterTitle, setSelectedNewsletterTitle] = useState<string>("");
  
  const [formData, setFormData] = useState({
    division: "corporate" as Division,
    title: "",
    description: "",
  });

  const isAdmin = user?.role === "admin";

  const { data: newsletters = [], isLoading } = useQuery<Newsletter[]>({
    queryKey: ["/api/newsletters"],
    queryFn: async () => {
      const response = await fetch("/api/newsletters");
      if (!response.ok) throw new Error("Failed to fetch newsletters");
      return response.json();
    },
  });

  // Fetch analytics summary for all newsletters
  const { data: analyticsData = [] } = useQuery<NewsletterAnalyticsSummary[]>({
    queryKey: ["/api/newsletters/analytics"],
    queryFn: async () => {
      const response = await fetch("/api/newsletters/analytics");
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  // Fetch detailed analytics for selected newsletter
  const { data: detailedAnalytics, isLoading: isLoadingDetails } = useQuery<NewsletterAnalyticsDetail>({
    queryKey: ["/api/newsletters", selectedNewsletterId, "analytics"],
    queryFn: async () => {
      if (!selectedNewsletterId) return null;
      const response = await fetch(`/api/newsletters/${selectedNewsletterId}/analytics`);
      if (!response.ok) throw new Error("Failed to fetch newsletter analytics");
      return response.json();
    },
    enabled: !!selectedNewsletterId,
  });

  // Create a map for quick lookup of analytics by newsletter ID
  const analyticsMap = new Map<string, NewsletterAnalyticsSummary>();
  analyticsData.forEach(a => analyticsMap.set(a.id, a));

  const openAnalyticsDialog = (newsletter: Newsletter) => {
    setSelectedNewsletterId(String(newsletter.id));
    setSelectedNewsletterTitle(newsletter.title);
    setAnalyticsDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: {
      division: string;
      title: string;
      description: string;
      fileUrl: string;
      fileName: string;
    }) => {
      const response = await apiRequest("POST", "/api/newsletters", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/newsletters"] });
      setIsUploadDialogOpen(false);
      resetForm();
      toast({ title: "Newsletter uploaded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to upload newsletter", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/newsletters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/newsletters"] });
      toast({ title: "Newsletter deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete newsletter", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ division: "corporate", title: "", description: "" });
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.title) {
        setFormData({ ...formData, title: file.name.replace(/\.[^/.]+$/, "") });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({ title: "Please select a file", variant: "destructive" });
      return;
    }
    
    setIsUploading(true);
    
    try {
      const uploadResponse = await fetch('/api/objects/upload', {
        method: 'POST',
      });
      const { uploadURL } = await uploadResponse.json();
      
      await fetch(uploadURL, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type || 'application/octet-stream',
        },
      });
      
      // Extract the entity ID from the upload URL path and format as /objects/entityId
      const url = new URL(uploadURL);
      const pathParts = url.pathname.split('/.private/');
      const entityId = pathParts.length > 1 ? pathParts[1] : url.pathname.split('/').pop();
      const fileUrl = `/objects/${entityId}`;
      
      createMutation.mutate({
        division: formData.division,
        title: formData.title,
        description: formData.description,
        fileUrl,
        fileName: selectedFile.name,
      });
    } catch (error) {
      toast({ title: "Failed to upload file", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>
              You need administrator privileges to access this page. Please contact your system administrator if you believe you should have access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative h-40 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#51142a]/90 via-[#51142a]/80 to-[#0E2841]/70" />
        <div className="relative z-10 h-full flex items-center px-6 md:px-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Newsletter Management</h1>
              <p className="text-white/80">
                Upload and manage VP newsletters for all divisions
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div></div>
        
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button
              data-testid="button-upload-newsletter"
              data-goatcounter-click="admin-upload-newsletter"
              data-goatcounter-title="Open newsletter upload dialog"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload Newsletter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Newsletter</DialogTitle>
              <DialogDescription>
                Upload a new VP newsletter to share with employees.
              </DialogDescription>
            </DialogHeader>
            
            <div className="rounded-lg border border-amber-500 bg-amber-50 dark:bg-amber-950/20 p-4 mb-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">CUI Material Warning</p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    Do not upload Controlled Unclassified Information (CUI) material to this system.
                  </p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="division">Division</Label>
                <Select
                  value={formData.division}
                  onValueChange={(value: Division) => setFormData({ ...formData, division: value })}
                >
                  <SelectTrigger data-testid="select-newsletter-division">
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corporate">Albers Corporate</SelectItem>
                    <SelectItem value="defense">Albers Defense</SelectItem>
                    <SelectItem value="industrials">Albers Industrials</SelectItem>
                    <SelectItem value="advanced_programs">Albers Advanced Programs</SelectItem>
                    <SelectItem value="bou">Business Operations Unit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="file">Newsletter File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  required
                  data-testid="input-newsletter-file"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Newsletter title"
                  required
                  data-testid="input-newsletter-title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the newsletter contents"
                  rows={3}
                  data-testid="input-newsletter-description"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadDialogOpen(false)}
                  data-goatcounter-click="admin-newsletter-cancel"
                  data-goatcounter-title="Cancel newsletter upload"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || createMutation.isPending}
                  data-testid="button-submit-newsletter"
                  data-goatcounter-click="admin-submit-newsletter"
                  data-goatcounter-title="Submit newsletter upload"
                >
                  {isUploading || createMutation.isPending ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Newsletter
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : newsletters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No newsletters yet</h3>
            <p className="text-muted-foreground text-center">
              Upload your first newsletter to share with employees.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {newsletters.map((newsletter) => (
            <Card key={newsletter.id} data-testid={`card-newsletter-${newsletter.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {divisionLabels[newsletter.division as Division] || newsletter.division}
                    </Badge>
                    {newsletter.is_current ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        Current
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-200 text-slate-700 border-slate-300">
                        Archived
                      </Badge>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-delete-newsletter-${newsletter.id}`}
                        data-goatcounter-click="admin-delete-newsletter"
                        data-goatcounter-title="Delete newsletter"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Newsletter</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to permanently delete "{newsletter.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(newsletter.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <CardTitle className="text-base">{newsletter.title}</CardTitle>
                <CardDescription>
                  {safeFormatDate(newsletter.published_at, "MMMM d, yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {newsletter.description && (
                  <p className="text-sm text-muted-foreground">{newsletter.description}</p>
                )}
                
                {/* View Count Display */}
                {(() => {
                  const analytics = analyticsMap.get(String(newsletter.id));
                  return (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Eye className="w-4 h-4" />
                        <span>{analytics?.uniqueViews || 0} unique views</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAnalyticsDialog(newsletter)}
                        data-testid={`button-analytics-newsletter-${newsletter.id}`}
                      >
                        <BarChart3 className="w-4 h-4 mr-1" />
                        View Analytics
                      </Button>
                    </div>
                  );
                })()}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open(newsletter.file_url, "_blank")}
                  data-testid={`button-download-newsletter-${newsletter.id}`}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download ({newsletter.file_name})
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Analytics Dialog */}
      <Dialog open={analyticsDialogOpen} onOpenChange={setAnalyticsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Newsletter Analytics
            </DialogTitle>
            <DialogDescription>
              Viewing statistics for "{selectedNewsletterTitle}"
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingDetails ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : detailedAnalytics ? (
            <div className="space-y-6 overflow-hidden flex flex-col flex-1">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{detailedAnalytics.uniqueViews}</p>
                        <p className="text-sm text-muted-foreground">Unique Viewers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Eye className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{detailedAnalytics.totalViews}</p>
                        <p className="text-sm text-muted-foreground">Total Views</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Views by Division */}
              {detailedAnalytics.byDivision.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Views by Division
                  </h4>
                  <div className="space-y-2">
                    {detailedAnalytics.byDivision.map((div) => (
                      <div key={div.division} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">
                          {divisionLabels[div.division as Division] || div.division || "Unassigned"}
                        </span>
                        <Badge variant="outline">{div.uniqueViews} viewers</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Individual Users */}
              {detailedAnalytics.byUser.length > 0 && (
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Individual Viewers ({detailedAnalytics.byUser.length})
                  </h4>
                  <ScrollArea className="flex-1">
                    <div className="space-y-2 pr-4">
                      {detailedAnalytics.byUser.map((user) => (
                        <div key={user.userId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.email}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {divisionLabels[user.division as Division] || user.division || "No division"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{user.viewCount} view{user.viewCount !== 1 ? 's' : ''}</p>
                            <p className="text-xs text-muted-foreground">
                              Last: {safeFormatDate(user.lastViewed, "MMM d, h:mm a")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
              
              {detailedAnalytics.uniqueViews === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No views recorded yet</p>
                  <p className="text-sm">Views are tracked when users click "Read More" on newsletters</p>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
