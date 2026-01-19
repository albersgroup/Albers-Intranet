import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Archive, ArchiveX, Trash2, FileText, ShieldAlert, Newspaper, Pin, PinOff, Upload, X, ExternalLink, AlertTriangle, Paperclip } from "lucide-react";
import { safeFormatDate } from "@/lib/utils";
import heroImage from "@assets/73936_1765410601840.jpg";

interface NewsArticle {
  id: number;
  division: string;
  title: string;
  summary: string;
  content: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  published_at: string;
  is_archived: boolean;
  is_pinned: boolean;
  isPinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

type Division = "corporate" | "defense" | "industrials" | "advanced_programs" | "bou";

const divisionLabels: Record<Division, string> = {
  corporate: "Albers Corporate",
  defense: "Albers Defense",
  industrials: "Albers Industrials",
  advanced_programs: "Albers Advanced Programs",
  bou: "Business Operations Unit",
};

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export default function NewsAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  
  const [formData, setFormData] = useState({
    division: "corporate" as Division,
    title: "",
    content: "",
    attachmentUrl: null as string | null,
    attachmentName: null as string | null,
    attachmentType: null as string | null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === "admin";

  const { data: articles = [], isLoading } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news", showArchived ? "all" : "active"],
    queryFn: async () => {
      const response = await fetch(`/api/news?includeArchived=${showArchived}`);
      if (!response.ok) throw new Error("Failed to fetch articles");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/news", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Bulletin created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create bulletin", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof formData> }) => {
      const response = await apiRequest("PATCH", `/api/news/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      setEditingArticle(null);
      resetForm();
      toast({ title: "Bulletin updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update bulletin", description: error.message, variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, isArchived }: { id: number; isArchived: boolean }) => {
      const response = await apiRequest("POST", `/api/news/${id}/archive`, { isArchived });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({ title: "Bulletin archive status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update bulletin archive status", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/news/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({ title: "Bulletin deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete bulletin", description: error.message, variant: "destructive" });
    },
  });

  const pinMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("PATCH", `/api/news/${id}/pin`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({ title: "Bulletin pin status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update pin status", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ 
      division: "corporate", 
      title: "", 
      content: "",
      attachmentUrl: null,
      attachmentName: null,
      attachmentType: null,
    });
  };

  const handleEdit = (article: NewsArticle) => {
    setEditingArticle(article);
    setFormData({
      division: article.division as Division,
      title: article.title,
      content: article.content,
      attachmentUrl: article.attachment_url,
      attachmentName: article.attachment_name,
      attachmentType: article.attachment_type,
    });
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ 
        title: "Invalid file type", 
        description: "Only PDF and image files (JPEG, PNG, GIF, WebP) are allowed.", 
        variant: "destructive" 
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ 
        title: "File too large", 
        description: "Maximum file size is 10MB.", 
        variant: "destructive" 
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `bulletins/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const uploadUrlResponse = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName }),
      });
      
      if (!uploadUrlResponse.ok) {
        throw new Error('Failed to get upload URL');
      }
      
      const { uploadURL } = await uploadUrlResponse.json();
      
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }
      
      const objectPath = `/objects/${fileName}`;
      
      setFormData(prev => ({
        ...prev,
        attachmentUrl: objectPath,
        attachmentName: file.name,
        attachmentType: file.type,
      }));
      
      toast({ title: "File uploaded successfully" });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ 
        title: "Upload failed", 
        description: "Failed to upload file. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = () => {
    setFormData(prev => ({
      ...prev,
      attachmentUrl: null,
      attachmentName: null,
      attachmentType: null,
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, data: formData });
    } else {
      createMutation.mutate(formData);
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
              <Newspaper className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Bulletin Management</h1>
              <p className="text-white/80">
                Create, edit, and manage bulletins for all divisions
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div></div>
        
        <div className="flex items-center gap-3">
          <Button
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(!showArchived)}
            data-testid="button-toggle-archived"
          >
            <Archive className="w-4 h-4 mr-2" />
            {showArchived ? "Showing All" : "Show Archived"}
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-bulletin">
                <Plus className="w-4 h-4 mr-2" />
                Create Bulletin
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Bulletin</DialogTitle>
                <DialogDescription>
                  Create a new bulletin to be published on the intranet.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="division">Division</Label>
                  <Select
                    value={formData.division}
                    onValueChange={(value: Division) => setFormData({ ...formData, division: value })}
                  >
                    <SelectTrigger data-testid="select-division">
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
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Bulletin title"
                    required
                    data-testid="input-title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <RichTextEditor
                    content={formData.content}
                    onChange={(content) => setFormData({ ...formData, content })}
                    placeholder="Write your bulletin content here..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Attachment (Optional)</Label>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md mb-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        <strong>CUI Warning:</strong> Do not upload Controlled Unclassified Information (CUI) material. 
                        Only upload files appropriate for intranet distribution.
                      </p>
                    </div>
                  </div>
                  
                  {formData.attachmentUrl ? (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                      <span className="flex-1 text-sm truncate">{formData.attachmentName}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={removeAttachment}
                        data-testid="button-remove-attachment"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                        data-testid="input-file-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        data-testid="button-upload-file"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {isUploading ? "Uploading..." : "Upload PDF or Image"}
                      </Button>
                      <span className="text-xs text-muted-foreground">Max 10MB</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || isUploading} data-testid="button-submit-create">
                    {createMutation.isPending ? "Creating..." : "Create Bulletin"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No bulletins yet</h3>
            <p className="text-muted-foreground text-center">
              Create your first bulletin to display on the intranet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <Card key={article.id} className={article.is_archived ? "opacity-60" : ""} data-testid={`card-article-${article.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {divisionLabels[article.division as Division] || article.division}
                      </Badge>
                      {(article.is_pinned || article.isPinned) && (
                        <Badge variant="default" className="bg-primary">
                          <Pin className="w-3 h-3 mr-1" />
                          Pinned
                        </Badge>
                      )}
                      {article.is_archived && (
                        <Badge variant="secondary">Archived</Badge>
                      )}
                      {article.attachment_url && (
                        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          <Paperclip className="w-3 h-3 mr-1" />
                          Attachment
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{article.title}</CardTitle>
                    <CardDescription className="mt-1">
                      Published: {safeFormatDate(article.published_at, "MMM d, yyyy 'at' h:mm a")}
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => pinMutation.mutate(article.id)}
                      data-testid={`button-pin-${article.id}`}
                      title={(article.is_pinned || article.isPinned) ? "Unpin from top" : "Pin to top"}
                    >
                      {(article.is_pinned || article.isPinned) ? <PinOff className="w-4 h-4 text-primary" /> : <Pin className="w-4 h-4" />}
                    </Button>
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(article)}
                      data-testid={`button-edit-${article.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => archiveMutation.mutate({ id: article.id, isArchived: !article.is_archived })}
                      data-testid={`button-archive-${article.id}`}
                    >
                      {article.is_archived ? <ArchiveX className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" data-testid={`button-delete-${article.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Bulletin</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to permanently delete "{article.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(article.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{stripHtml(article.content)}</p>
                {article.attachment_url && (
                  <div className="mt-3 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(article.attachment_url!, '_blank', 'noopener,noreferrer')}
                      data-testid={`button-view-attachment-${article.id}`}
                    >
                      <ExternalLink className="w-3 h-3 mr-2" />
                      View {article.attachment_name || 'Attachment'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingArticle} onOpenChange={(open) => !open && setEditingArticle(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Bulletin</DialogTitle>
            <DialogDescription>
              Update the bulletin details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-division">Division</Label>
              <Select
                value={formData.division}
                onValueChange={(value: Division) => setFormData({ ...formData, division: value })}
              >
                <SelectTrigger data-testid="select-edit-division">
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporate">Albers Corporate</SelectItem>
                  <SelectItem value="defense">Albers Defense</SelectItem>
                  <SelectItem value="industrials">Albers Industrials</SelectItem>
                  <SelectItem value="advanced_programs">Albers Advanced Programs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Bulletin title"
                required
                data-testid="input-edit-title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <RichTextEditor
                content={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                placeholder="Write your bulletin content here..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Attachment (Optional)</Label>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md mb-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    <strong>CUI Warning:</strong> Do not upload Controlled Unclassified Information (CUI) material. 
                    Only upload files appropriate for intranet distribution.
                  </p>
                </div>
              </div>
              
              {formData.attachmentUrl ? (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 text-sm truncate">{formData.attachmentName}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={removeAttachment}
                    data-testid="button-edit-remove-attachment"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    data-testid="input-edit-file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid="button-edit-upload-file"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? "Uploading..." : "Upload PDF or Image"}
                  </Button>
                  <span className="text-xs text-muted-foreground">Max 10MB</span>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingArticle(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending || isUploading} data-testid="button-submit-edit">
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
