import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { isBouAdmin } from "@/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { safeFormatDate } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Link as LinkIcon, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Edit, 
  GripVertical, 
  Image, 
  Upload, 
  CheckCircle,
  Presentation,
  Bot,
  Save,
  Eye,
  EyeOff,
  FileText,
  Video,
  Play,
  Users,
  ClipboardList,
  Mail,
  Calendar,
  Search,
  X,
  LayoutGrid,
  Columns,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Newspaper,
  Archive,
  BarChart3,
  User
} from "lucide-react";
import PDFThumbnail from "@/components/PDFThumbnail";

interface QuickLink {
  id: string;
  link_type: "internal" | "external";
  title: string;
  description: string;
  icon: string;
  url: string;
  sort_order: number;
  is_visible: boolean;
}

interface HeroAsset {
  id: string;
  file_url: string;
  file_name: string;
  alt_text: string;
  is_active: boolean;
  created_at: string;
}

interface TrainingSlide {
  id: string;
  title: string;
  caption: string;
  file_url: string;
  file_name: string;
  file_type: "image" | "pdf" | "video";
  sort_order: number;
  is_published: boolean;
  category_id: string;
}

interface TrainingCategory {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
}

interface BotSetting {
  id: string;
  setting_key: string;
  setting_value: string;
}

interface LayoutSection {
  id: string;
  section_key: string;
  display_name: string;
  sort_order: number;
  column_span: number;
  is_visible: boolean;
}

interface Newsletter {
  id: string;
  division: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  published_at: string;
  is_current: boolean;
}


interface NewsArticle {
  id: number;
  division: string;
  title: string;
  summary: string;
  content: string;
  is_archived: boolean;
  created_at: string;
}

const AVAILABLE_ICONS = [
  "Link", "ExternalLink", "LayoutDashboard", "Presentation", "FileText", 
  "BarChart3", "CheckSquare", "Target", "TrendingUp", "Users", 
  "ClipboardCheck", "FilePlus2", "Settings", "Briefcase", "Building2"
];

export default function BOUAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  if (!user || !isBouAdmin(user.role)) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">You need BOU Control Panel permissions to access this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">BOU Control Panel</h1>
        <p className="text-muted-foreground">Manage Business Operations Unit configurable content</p>
      </div>

      <Tabs defaultValue="layout" className="space-y-4">
        <div className="space-y-2">
          <TabsList className="h-auto p-0 bg-transparent gap-2 flex flex-wrap">
            <TabsTrigger 
              value="layout" 
              data-testid="tab-layout"
              className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Layout
            </TabsTrigger>
            <TabsTrigger 
              value="hero" 
              data-testid="tab-hero"
              className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
            >
              <Image className="w-4 h-4 mr-2" />
              Hero
            </TabsTrigger>
            <TabsTrigger 
              value="quick-links" 
              data-testid="tab-quick-links"
              className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              Quick Links
            </TabsTrigger>
            <TabsTrigger 
              value="newsletter" 
              data-testid="tab-newsletter"
              className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
            >
              <FileText className="w-4 h-4 mr-2" />
              Newsletter
            </TabsTrigger>
                      </TabsList>
          <TabsList className="h-auto p-0 bg-transparent gap-2 flex flex-wrap">
            <TabsTrigger 
              value="news" 
              data-testid="tab-news"
              className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
            >
              <Newspaper className="w-4 h-4 mr-2" />
              News
            </TabsTrigger>
            <TabsTrigger 
              value="training" 
              data-testid="tab-training"
              className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
            >
              <Presentation className="w-4 h-4 mr-2" />
              Training
            </TabsTrigger>
            <TabsTrigger 
              value="bot" 
              data-testid="tab-bot"
              className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
            >
              <Bot className="w-4 h-4 mr-2" />
              Bot Settings
            </TabsTrigger>
            <TabsTrigger 
              value="assignments" 
              data-testid="tab-assignments"
              className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              Assignments
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              data-testid="tab-analytics"
              className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="quick-links">
          <QuickLinksManager />
        </TabsContent>

        <TabsContent value="hero">
          <HeroManager />
        </TabsContent>

        <TabsContent value="training">
          <TrainingManager />
        </TabsContent>

        <TabsContent value="bot">
          <BotSettingsManager />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsManager />
        </TabsContent>

        <TabsContent value="layout">
          <LayoutManager />
        </TabsContent>

        <TabsContent value="newsletter">
          <BOUNewsletterManager />
        </TabsContent>

        
        <TabsContent value="news">
          <BOUNewsManager />
        </TabsContent>

        <TabsContent value="analytics">
          <BOUAnalyticsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuickLinksManager() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [localLinks, setLocalLinks] = useState<QuickLink[]>([]);
  const [formData, setFormData] = useState({
    linkType: "internal" as "internal" | "external",
    title: "",
    description: "",
    icon: "Link",
    url: "",
    isVisible: true
  });

  const { data: links = [], isLoading } = useQuery<QuickLink[]>({
    queryKey: ["/api/bou/admin/quick-links"]
  });

  // Sync local links with fetched data
  useState(() => {
    if (links.length > 0 && localLinks.length === 0) {
      setLocalLinks(links);
    }
  });

  // Update local links when server data changes
  if (links.length > 0 && JSON.stringify(links) !== JSON.stringify(localLinks)) {
    setLocalLinks(links);
  }

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => 
      apiRequest("POST", "/api/bou/admin/quick-links", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/quick-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bou/quick-links"] });
      toast({ title: "Quick link created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => toast({ title: "Failed to create quick link", variant: "destructive" })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & typeof formData) =>
      apiRequest("PUT", `/api/bou/admin/quick-links/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/quick-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bou/quick-links"] });
      toast({ title: "Quick link updated successfully" });
      setIsDialogOpen(false);
      setEditingLink(null);
      resetForm();
    },
    onError: () => toast({ title: "Failed to update quick link", variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/bou/admin/quick-links/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/quick-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bou/quick-links"] });
      toast({ title: "Quick link deleted successfully" });
    },
    onError: () => toast({ title: "Failed to delete quick link", variant: "destructive" })
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => 
      apiRequest("POST", "/api/bou/admin/quick-links/reorder", { orderedIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/quick-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bou/quick-links"] });
      toast({ title: "Quick links reordered successfully" });
    },
    onError: () => toast({ title: "Failed to reorder quick links", variant: "destructive" })
  });

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const currentLinks = [...localLinks];
    const draggedIndex = currentLinks.findIndex(l => l.id === draggedId);
    const targetIndex = currentLinks.findIndex(l => l.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    // Remove dragged item and insert at target position
    const [draggedItem] = currentLinks.splice(draggedIndex, 1);
    currentLinks.splice(targetIndex, 0, draggedItem);

    // Update local state immediately for visual feedback
    setLocalLinks(currentLinks);
    setDraggedId(null);

    // Save to server
    const orderedIds = currentLinks.map(l => l.id);
    reorderMutation.mutate(orderedIds);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const resetForm = () => {
    setFormData({ linkType: "internal", title: "", description: "", icon: "Link", url: "", isVisible: true });
  };

  const openEditDialog = (link: QuickLink) => {
    setEditingLink(link);
    setFormData({
      linkType: link.link_type,
      title: link.title,
      description: link.description,
      icon: link.icon,
      url: link.url,
      isVisible: link.is_visible
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingLink) {
      updateMutation.mutate({ id: editingLink.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) return <div className="text-center p-4">Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Manage tool cards and external links on the BOU home page</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) { setEditingLink(null); resetForm(); }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-quick-link">
              <Plus className="w-4 h-4 mr-2" />
              Add Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLink ? "Edit Quick Link" : "Add Quick Link"}</DialogTitle>
              <DialogDescription>Configure the quick link details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Link Type</Label>
                <Select value={formData.linkType} onValueChange={(v) => setFormData(prev => ({ ...prev, linkType: v as "internal" | "external" }))}>
                  <SelectTrigger data-testid="select-link-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal Tool</SelectItem>
                    <SelectItem value="external">External Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input 
                  value={formData.title} 
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Link title"
                  data-testid="input-link-title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input 
                  value={formData.description} 
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Short description"
                  data-testid="input-link-description"
                />
              </div>
              <div>
                <Label>Icon</Label>
                <Select value={formData.icon} onValueChange={(v) => setFormData(prev => ({ ...prev, icon: v }))}>
                  <SelectTrigger data-testid="select-link-icon">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ICONS.map(icon => (
                      <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>URL / Path</Label>
                <Input 
                  value={formData.url} 
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder={formData.linkType === "internal" ? "/path-to-page" : "https://example.com"}
                  data-testid="input-link-url"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={formData.isVisible}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isVisible: checked }))}
                  data-testid="switch-link-visible"
                />
                <Label>Visible</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} data-testid="button-save-link">
                <Save className="w-4 h-4 mr-2" />
                {editingLink ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {localLinks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No quick links configured. Add your first link to get started.</p>
          ) : (
            localLinks.map((link) => (
              <div 
                key={link.id} 
                className={`flex items-center gap-3 p-3 border rounded-lg transition-all ${
                  draggedId === link.id ? "opacity-50 border-primary" : "hover-elevate"
                }`}
                data-testid={`quick-link-${link.id}`}
                draggable
                onDragStart={(e) => handleDragStart(e, link.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, link.id)}
                onDragEnd={handleDragEnd}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{link.title}</span>
                    <Badge variant={link.link_type === "internal" ? "default" : "outline"}>
                      {link.link_type === "internal" ? <LinkIcon className="w-3 h-3 mr-1" /> : <ExternalLink className="w-3 h-3 mr-1" />}
                      {link.link_type}
                    </Badge>
                    {!link.is_visible && (
                      <Badge variant="outline" className="text-muted-foreground">
                        <EyeOff className="w-3 h-3 mr-1" />
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{link.description}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => openEditDialog(link)} data-testid={`button-edit-link-${link.id}`}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(link.id)} data-testid={`button-delete-link-${link.id}`}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
        {reorderMutation.isPending && (
          <p className="text-sm text-muted-foreground text-center mt-2">Saving order...</p>
        )}
      </CardContent>
    </Card>
  );
}

function HeroManager() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const { data: assets = [], isLoading } = useQuery<HeroAsset[]>({
    queryKey: ["/api/bou/admin/hero-assets"]
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/bou/admin/hero-assets/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/hero-assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bou/hero-asset"] });
      toast({ title: "Hero image activated" });
    },
    onError: () => toast({ title: "Failed to activate hero image", variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/bou/admin/hero-assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/hero-assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bou/hero-asset"] });
      toast({ title: "Hero image deleted" });
    },
    onError: () => toast({ title: "Failed to delete hero image", variant: "destructive" })
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/bou/admin/hero-assets", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/hero-assets"] });
        toast({ title: "Hero image uploaded successfully" });
      } else {
        throw new Error("Upload failed");
      }
    } catch {
      toast({ title: "Failed to upload hero image", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <div className="text-center p-4">Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Hero Image</CardTitle>
          <CardDescription>Manage the hero background image on the BOU home page</CardDescription>
          <p className="text-xs text-muted-foreground mt-1">Recommended: 1920×600px, JPEG, under 500KB</p>
        </div>
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            id="hero-upload"
            disabled={uploading}
          />
          <label htmlFor="hero-upload">
            <Button asChild disabled={uploading}>
              <span data-testid="button-upload-hero">
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Upload Image"}
              </span>
            </Button>
          </label>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {assets.length === 0 ? (
            <p className="col-span-full text-muted-foreground text-center py-8">No hero images uploaded. Upload your first image to get started.</p>
          ) : (
            assets.map((asset) => (
              <div 
                key={asset.id} 
                className={`relative rounded-lg overflow-hidden border-2 ${asset.is_active ? "border-primary" : "border-muted"}`}
                data-testid={`hero-asset-${asset.id}`}
              >
                <img 
                  src={asset.file_url} 
                  alt={asset.alt_text || asset.file_name}
                  className="w-full h-32 object-cover"
                />
                {asset.is_active && (
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-primary">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 flex justify-between items-center">
                  <span className="text-white text-xs truncate">{asset.file_name}</span>
                  <div className="flex gap-1">
                    {!asset.is_active && (
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-white" onClick={() => activateMutation.mutate(asset.id)}>
                        <Eye className="w-3 h-3" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-white" onClick={() => deleteMutation.mutate(asset.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TrainingManager() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [editingSlide, setEditingSlide] = useState<TrainingSlide | null>(null);
  const [editForm, setEditForm] = useState({ title: "", caption: "", isPublished: true });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TrainingCategory | null>(null);
  const [editCategoryForm, setEditCategoryForm] = useState({ name: "", description: "", isPublished: true });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<TrainingCategory[]>({
    queryKey: ["/api/bou/admin/training-categories"]
  });

  const { data: slides = [], isLoading: slidesLoading } = useQuery<TrainingSlide[]>({
    queryKey: ["/api/bou/admin/training-slides", selectedCategoryId],
    queryFn: async () => {
      const url = selectedCategoryId 
        ? `/api/bou/admin/training-slides?categoryId=${selectedCategoryId}`
        : "/api/bou/admin/training-slides";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch slides");
      return res.json();
    },
    enabled: !!selectedCategoryId
  });

  // Set default category when categories load
  if (categories.length > 0 && !selectedCategoryId) {
    setSelectedCategoryId(categories[0].id);
  }

  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      apiRequest("POST", "/api/bou/admin/training-categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/training-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bou/training-categories"] });
      toast({ title: "Category created successfully" });
      setIsCategoryDialogOpen(false);
      setNewCategoryName("");
      setNewCategoryDescription("");
    },
    onError: () => toast({ title: "Failed to create category", variant: "destructive" })
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name: string; description: string; isPublished: boolean }) =>
      apiRequest("PUT", `/api/bou/admin/training-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/training-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bou/training-categories"] });
      toast({ title: "Category updated successfully" });
      setEditingCategory(null);
    },
    onError: () => toast({ title: "Failed to update category", variant: "destructive" })
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/bou/admin/training-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/training-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bou/training-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/training-slides"] });
      toast({ title: "Category deleted (including all modules)" });
      setSelectedCategoryId(null);
    },
    onError: () => toast({ title: "Failed to delete category", variant: "destructive" })
  });

  const updateSlideMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; title: string; caption: string; isPublished: boolean; sortOrder: number }) =>
      apiRequest("PUT", `/api/bou/admin/training-slides/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/training-slides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bou/training-slides"] });
      toast({ title: "Module updated successfully" });
      setEditingSlide(null);
    },
    onError: () => toast({ title: "Failed to update module", variant: "destructive" })
  });

  const deleteSlideMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/bou/admin/training-slides/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/training-slides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bou/training-slides"] });
      toast({ title: "Module deleted" });
    },
    onError: () => toast({ title: "Failed to delete module", variant: "destructive" })
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!selectedCategoryId) {
      toast({ title: "Please select a category first", variant: "destructive" });
      return;
    }

    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));
      formData.append("categoryId", selectedCategoryId);

      try {
        const response = await fetch("/api/bou/admin/training-slides", {
          method: "POST",
          body: formData,
          credentials: "include"
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Upload failed: ${response.status}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Upload failed";
        toast({ title: `Failed to upload ${file.name}: ${errorMsg}`, variant: "destructive" });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/training-slides"] });
    toast({ title: `${files.length} material(s) uploaded successfully` });
    setUploading(false);
    e.target.value = "";
  };

  const openEditDialog = (slide: TrainingSlide) => {
    setEditingSlide(slide);
    setEditForm({ title: slide.title, caption: slide.caption || "", isPublished: slide.is_published });
  };

  const handleSaveEdit = () => {
    if (!editingSlide) return;
    updateSlideMutation.mutate({ 
      id: editingSlide.id, 
      title: editForm.title, 
      caption: editForm.caption,
      isPublished: editForm.isPublished,
      sortOrder: editingSlide.sort_order
    });
  };

  const openEditCategoryDialog = (category: TrainingCategory) => {
    setEditingCategory(category);
    setEditCategoryForm({ 
      name: category.name, 
      description: category.description || "", 
      isPublished: category.is_published 
    });
  };

  const handleSaveCategoryEdit = () => {
    if (!editingCategory) return;
    updateCategoryMutation.mutate({
      id: editingCategory.id,
      name: editCategoryForm.name,
      description: editCategoryForm.description,
      isPublished: editCategoryForm.isPublished
    });
  };

  const isLoading = categoriesLoading || slidesLoading;
  if (categoriesLoading) return <div className="text-center p-4">Loading...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Training Categories</CardTitle>
            <CardDescription>Organize training materials into categories</CardDescription>
          </div>
          <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-category">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Training Category</DialogTitle>
                <DialogDescription>Add a new category to organize training materials</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Category Name</Label>
                  <Input 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Proposal Training, Pricing Tool Training"
                    data-testid="input-category-name"
                  />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea 
                    value={newCategoryDescription}
                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                    placeholder="Brief description of this training category"
                    data-testid="input-category-description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={() => createCategoryMutation.mutate({ name: newCategoryName, description: newCategoryDescription })}
                  disabled={!newCategoryName.trim()}
                  data-testid="button-save-category"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Create Category
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No categories yet. Create one to start adding training materials.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center gap-1">
                  <Button
                    variant={selectedCategoryId === category.id ? "default" : "outline"}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className="flex items-center gap-2"
                    data-testid={`button-category-${category.id}`}
                  >
                    <Presentation className="w-4 h-4" />
                    {category.name}
                    {!category.is_published && <Badge variant="outline" className="ml-1 text-xs">Draft</Badge>}
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={() => openEditCategoryDialog(category)}
                    data-testid={`button-edit-category-${category.id}`}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-destructive"
                    onClick={() => {
                      if (confirm(`Delete "${category.name}" and ALL its training materials?`)) {
                        deleteCategoryMutation.mutate(category.id);
                      }
                    }}
                    data-testid={`button-delete-category-${category.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCategoryId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Training Modules</CardTitle>
              <CardDescription>
                {categories.find(c => c.id === selectedCategoryId)?.name} ({slides.length} modules)
              </CardDescription>
              <p className="text-xs text-muted-foreground mt-1">Supports: Images (50MB), PDFs (50MB), Videos (200MB)</p>
            </div>
            <div>
              <input
                type="file"
                accept="image/*,application/pdf,video/*"
                multiple
                onChange={handleUpload}
                className="hidden"
                id="slides-upload"
                disabled={uploading}
              />
              <label htmlFor="slides-upload">
                <Button asChild disabled={uploading}>
                  <span data-testid="button-upload-slides">
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload Materials"}
                  </span>
                </Button>
              </label>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {slides.length === 0 ? (
                <p className="col-span-full text-muted-foreground text-center py-8">No training materials in this category. Upload images, PDFs, or videos to get started.</p>
              ) : (
                slides.map((slide, index) => (
                  <div 
                    key={slide.id} 
                    className="relative rounded-lg overflow-hidden border group"
                    data-testid={`training-slide-${slide.id}`}
                  >
                    <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded z-10">
                      #{index + 1}
                    </div>
                    <div className="absolute top-1 right-1 z-10 flex gap-1">
                      <Badge variant="secondary" className="text-xs capitalize">{slide.file_type || "image"}</Badge>
                      {!slide.is_published && (
                        <Badge variant="outline" className="bg-background/80 text-xs">Draft</Badge>
                      )}
                    </div>
                    {(slide.file_type === "image" || !slide.file_type) && (
                      <img 
                        src={slide.file_url} 
                        alt={slide.title}
                        className="w-full h-24 object-cover"
                      />
                    )}
                    {slide.file_type === "pdf" && (
                      <div className="w-full h-24">
                        <PDFThumbnail url={slide.file_url} title={slide.title} />
                      </div>
                    )}
                    {slide.file_type === "video" && (
                      <div className="w-full h-24 bg-black relative">
                        <video 
                          src={slide.file_url} 
                          className="w-full h-full object-cover"
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                            <Play className="w-5 h-5 text-white fill-white" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{slide.title}</p>
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => openEditDialog(slide)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => deleteSlideMutation.mutate(slide.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingSlide} onOpenChange={(open) => !open && setEditingSlide(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>Update module details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input 
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                data-testid="input-slide-title"
              />
            </div>
            <div>
              <Label>Caption</Label>
              <Textarea 
                value={editForm.caption}
                onChange={(e) => setEditForm(prev => ({ ...prev, caption: e.target.value }))}
                placeholder="Optional caption for this module"
                data-testid="input-slide-caption"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={editForm.isPublished}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isPublished: checked }))}
                data-testid="switch-slide-published"
              />
              <Label>Published</Label>
            </div>
            {editingSlide && (
              <div>
                <Label>Preview</Label>
                {(editingSlide.file_type === "image" || !editingSlide.file_type) && (
                  <img src={editingSlide.file_url} alt={editingSlide.title} className="w-full h-48 object-contain border rounded mt-2" />
                )}
                {editingSlide.file_type === "pdf" && (
                  <iframe 
                    src={editingSlide.file_url} 
                    className="w-full h-64 border rounded mt-2"
                    title={editingSlide.title}
                  />
                )}
                {editingSlide.file_type === "video" && (
                  <video 
                    src={editingSlide.file_url} 
                    controls 
                    className="w-full h-48 border rounded mt-2"
                  />
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEdit} data-testid="button-save-slide">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category Name</Label>
              <Input 
                value={editCategoryForm.name}
                onChange={(e) => setEditCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-edit-category-name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea 
                value={editCategoryForm.description}
                onChange={(e) => setEditCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this training category"
                data-testid="input-edit-category-description"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={editCategoryForm.isPublished}
                onCheckedChange={(checked) => setEditCategoryForm(prev => ({ ...prev, isPublished: checked }))}
                data-testid="switch-category-published"
              />
              <Label>Published</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveCategoryEdit} data-testid="button-save-edit-category">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BotSettingsManager() {
  const { toast } = useToast();
  const [greeting, setGreeting] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings = [], isLoading } = useQuery<BotSetting[]>({
    queryKey: ["/api/bou/admin/bot-settings"]
  });

  const greetingSetting = settings.find(s => s.setting_key === "greeting");

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      apiRequest("PUT", `/api/bou/admin/bot-settings/${key}`, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/bot-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bou/bot-settings", "greeting"] });
      toast({ title: "Bot settings saved" });
      setHasChanges(false);
    },
    onError: () => toast({ title: "Failed to save bot settings", variant: "destructive" })
  });

  const handleGreetingChange = (value: string) => {
    setGreeting(value);
    setHasChanges(value !== (greetingSetting?.setting_value || ""));
  };

  const handleSave = () => {
    updateMutation.mutate({ key: "greeting", value: greeting });
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading...</div>;
  }

  if (!greeting && greetingSetting?.setting_value) {
    setGreeting(greetingSetting.setting_value);
  }

  const defaultGreeting = `Hello! I'm Albers Bot, your AI assistant for the Albers Aerospace intranet. I'm here to help you navigate our portal, find information, and answer questions about:

**BOU & Proposal Support:**
- How to submit new opportunities
- Proposal process and training
- ClickUp dashboard guidance

**General Navigation:**
- Finding SOPs and documentation
- Division-specific resources
- Company news and updates

How can I help you today?`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bot Settings</CardTitle>
        <CardDescription>Configure the Albers Bot greeting message and behavior</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Greeting Message</Label>
          <p className="text-xs text-muted-foreground mb-2">
            This message is shown when users first open the Albers Bot. Supports markdown formatting.
          </p>
          <Textarea 
            value={greeting || defaultGreeting}
            onChange={(e) => handleGreetingChange(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
            placeholder="Enter bot greeting message..."
            data-testid="textarea-bot-greeting"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setGreeting(defaultGreeting);
              setHasChanges(defaultGreeting !== (greetingSetting?.setting_value || ""));
            }}
            data-testid="button-reset-greeting"
          >
            Reset to Default
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || updateMutation.isPending}
            data-testid="button-save-bot-settings"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface TrainingAssignment {
  id: string;
  slide_id: string;
  assigned_to_user_id: string;
  assigned_by_user_id: string;
  status: "assigned" | "viewed" | "completed";
  assigned_at: string;
  viewed_at: string | null;
  completed_at: string | null;
  due_at: string | null;
  notification_sent_at: string | null;
  slide_title: string;
  file_type: string;
  category_id: string;
  assigned_to_first_name: string;
  assigned_to_last_name: string;
  assigned_to_email: string;
  assigned_by_first_name: string;
  assigned_by_last_name: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

function AssignmentsManager() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSlideIds, setSelectedSlideIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [sendNotification, setSendNotification] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: categories = [] } = useQuery<TrainingCategory[]>({
    queryKey: ["/api/bou/admin/training-categories"]
  });

  const { data: allSlides = [] } = useQuery<TrainingSlide[]>({
    queryKey: ["/api/bou/admin/training-slides"],
    queryFn: async () => {
      const res = await fetch("/api/bou/admin/training-slides", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch slides");
      return res.json();
    }
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    }
  });

  const { data: assignments = [], isLoading } = useQuery<TrainingAssignment[]>({
    queryKey: ["/api/bou/admin/training-assignments"]
  });

  const createMutation = useMutation({
    mutationFn: (data: { slideIds: string[]; userIds: string[]; dueAt: string | null; sendNotification: boolean }) =>
      apiRequest("POST", "/api/bou/admin/training-assignments", data),
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/training-assignments"] });
      const result = await response.json() as { created: number; message: string };
      toast({ title: result.message || "Assignments created successfully" });
      setIsCreateDialogOpen(false);
      resetCreateForm();
    },
    onError: () => toast({ title: "Failed to create assignments", variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/bou/admin/training-assignments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/training-assignments"] });
      toast({ title: "Assignment removed" });
    },
    onError: () => toast({ title: "Failed to remove assignment", variant: "destructive" })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string; dueAt?: string | null; resendNotification?: boolean }) =>
      apiRequest("PATCH", `/api/bou/admin/training-assignments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/training-assignments"] });
      toast({ title: "Assignment updated" });
    },
    onError: () => toast({ title: "Failed to update assignment", variant: "destructive" })
  });

  const resetCreateForm = () => {
    setSelectedSlideIds([]);
    setSelectedUserIds([]);
    setDueDate("");
    setSendNotification(true);
    setUserSearch("");
  };

  const handleCreateAssignments = () => {
    if (selectedSlideIds.length === 0) {
      toast({ title: "Please select at least one training module", variant: "destructive" });
      return;
    }
    if (selectedUserIds.length === 0) {
      toast({ title: "Please select at least one user", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      slideIds: selectedSlideIds,
      userIds: selectedUserIds,
      dueAt: dueDate || null,
      sendNotification
    });
  };

  const toggleSlideSelection = (slideId: string) => {
    setSelectedSlideIds(prev => 
      prev.includes(slideId) 
        ? prev.filter(id => id !== slideId)
        : [...prev, slideId]
    );
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = users.filter(user => {
    const searchLower = userSearch.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      (user.firstName || "").toLowerCase().includes(searchLower) ||
      (user.lastName || "").toLowerCase().includes(searchLower)
    );
  });

  const filteredAssignments = assignments.filter(a => {
    if (filterStatus === "all") return true;
    return a.status === filterStatus;
  });

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Unknown";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned": return "bg-yellow-100 text-yellow-800";
      case "viewed": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Training Assignments</CardTitle>
            <CardDescription>Assign training modules to users and track completion</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-assignment">
                <Plus className="w-4 h-4 mr-2" />
                Assign Modules
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Assign Training Modules</DialogTitle>
                <DialogDescription>Select modules and users to create new assignments</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div>
                  <Label className="text-base font-semibold">1. Select Training Modules</Label>
                  <p className="text-sm text-muted-foreground mb-3">Choose which modules to assign</p>
                  <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                    {allSlides.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No training modules available</p>
                    ) : (
                      allSlides.map(slide => (
                        <div key={slide.id} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`slide-${slide.id}`}
                            checked={selectedSlideIds.includes(slide.id)}
                            onChange={() => toggleSlideSelection(slide.id)}
                            className="rounded border-gray-300"
                            data-testid={`checkbox-slide-${slide.id}`}
                          />
                          <label htmlFor={`slide-${slide.id}`} className="flex-1 cursor-pointer">
                            <span className="font-medium">{slide.title}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({getCategoryName(slide.category_id)})
                            </span>
                          </label>
                          <Badge variant="outline" className="text-xs">
                            {slide.file_type}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                  {selectedSlideIds.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedSlideIds.length} module(s) selected
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-base font-semibold">2. Select Users</Label>
                  <p className="text-sm text-muted-foreground mb-3">Choose who to assign the modules to</p>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-user-search"
                    />
                    {userSearch && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                        onClick={() => setUserSearch("")}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                    {filteredUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No users found</p>
                    ) : (
                      filteredUsers.map(user => {
                        const hasName = user.firstName || user.lastName;
                        const displayName = hasName 
                          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                          : null;
                        return (
                          <div key={user.id} className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`user-${user.id}`}
                              checked={selectedUserIds.includes(user.id)}
                              onChange={() => toggleUserSelection(user.id)}
                              className="rounded border-gray-300"
                              data-testid={`checkbox-user-${user.id}`}
                            />
                            <label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                              {displayName ? (
                                <>
                                  <span className="font-medium">{displayName}</span>
                                  <span className="text-xs text-muted-foreground ml-2">({user.email})</span>
                                </>
                              ) : (
                                <span className="font-medium">{user.email}</span>
                              )}
                            </label>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {selectedUserIds.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedUserIds.length} user(s) selected
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="due-date">Due Date (Optional)</Label>
                    <Input
                      id="due-date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-1"
                      data-testid="input-due-date"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <Switch
                      id="send-notification"
                      checked={sendNotification}
                      onCheckedChange={setSendNotification}
                      data-testid="switch-send-notification"
                    />
                    <Label htmlFor="send-notification" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Send email notification
                      </div>
                    </Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateAssignments}
                  disabled={createMutation.isPending || selectedSlideIds.length === 0 || selectedUserIds.length === 0}
                  data-testid="button-confirm-assignments"
                >
                  {createMutation.isPending ? "Creating..." : `Create ${selectedSlideIds.length * selectedUserIds.length} Assignment(s)`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Label>Filter by status:</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36" data-testid="select-filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="viewed">Viewed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1" />
            <Badge variant="outline">
              {filteredAssignments.length} assignment(s)
            </Badge>
          </div>

          {isLoading ? (
            <div className="text-center p-4">Loading assignments...</div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No assignments found</p>
              <p className="text-sm">Create assignments to track training completion</p>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Module</th>
                    <th className="text-left p-3 font-medium">Assigned To</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Due</th>
                    <th className="text-left p-3 font-medium">Assigned</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map(assignment => (
                    <tr key={assignment.id} className="border-t hover-elevate">
                      <td className="p-3">
                        <div>
                          <span className="font-medium">{assignment.slide_title}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({assignment.file_type})
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <span>{assignment.assigned_to_first_name} {assignment.assigned_to_last_name}</span>
                          <span className="text-xs text-muted-foreground block">{assignment.assigned_to_email}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={getStatusColor(assignment.status)}>
                          {assignment.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {assignment.due_at ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(assignment.due_at)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {formatDate(assignment.assigned_at)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          {assignment.status === "assigned" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Resend notification"
                              onClick={() => updateMutation.mutate({ id: assignment.id, resendNotification: true })}
                              data-testid={`button-resend-${assignment.id}`}
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Remove assignment"
                            onClick={() => deleteMutation.mutate(assignment.id)}
                            data-testid={`button-delete-${assignment.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LayoutManager() {
  const { toast } = useToast();
  const [localSections, setLocalSections] = useState<LayoutSection[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { data: sections = [], isLoading } = useQuery<LayoutSection[]>({
    queryKey: ["/api/bou/admin/home-layout"]
  });

  // Deep clone sections to avoid mutating the query cache
  const cloneSections = (items: LayoutSection[]): LayoutSection[] => 
    items.map(s => ({ ...s }));

  // Sync local sections with fetched data (only when not editing)
  if (sections.length > 0 && !initialized) {
    setLocalSections(cloneSections(sections));
    setInitialized(true);
  }
  if (sections.length > 0 && !hasChanges && initialized && JSON.stringify(sections) !== JSON.stringify(localSections)) {
    setLocalSections(cloneSections(sections));
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Deep clone and reorder
    const newSections = cloneSections(localSections);
    const [draggedItem] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, draggedItem);

    // Update sort_order values
    newSections.forEach((s, i) => {
      s.sort_order = i;
    });

    setLocalSections(newSections);
    setHasChanges(true);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const updateMutation = useMutation({
    mutationFn: (data: { sections: Array<{ id: string; sortOrder: number; columnSpan: number; isVisible: boolean }> }) =>
      apiRequest("PUT", "/api/bou/admin/home-layout", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/home-layout"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bou/home-layout"] });
      setHasChanges(false);
      setInitialized(false);
      toast({ title: "Layout updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update layout", variant: "destructive" });
    }
  });

  const resetMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/bou/admin/home-layout/reset"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bou/admin/home-layout"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bou/home-layout"] });
      setHasChanges(false);
      setInitialized(false);
      toast({ title: "Layout reset to defaults" });
    },
    onError: () => {
      toast({ title: "Failed to reset layout", variant: "destructive" });
    }
  });

  const moveSection = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localSections.length) return;
    
    // Deep clone to avoid mutating query cache
    const newSections = cloneSections(localSections);
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    
    // Update sort_order values on cloned objects
    newSections.forEach((s, i) => {
      s.sort_order = i;
    });
    
    setLocalSections(newSections);
    setHasChanges(true);
  };

  const toggleVisibility = (id: string) => {
    setLocalSections(prev => prev.map(s => 
      s.id === id ? { ...s, is_visible: !s.is_visible } : s
    ));
    setHasChanges(true);
  };

  const toggleColumnSpan = (id: string) => {
    setLocalSections(prev => prev.map(s => 
      s.id === id ? { ...s, column_span: s.column_span === 1 ? 2 : 1 } : s
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      sections: localSections.map(s => ({
        id: s.id,
        sortOrder: s.sort_order,
        columnSpan: s.column_span,
        isVisible: s.is_visible
      }))
    });
  };

  const handleReset = () => {
    resetMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading layout...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5" />
                Home Page Layout
              </CardTitle>
              <CardDescription>
                Configure the order, size, and visibility of BOU home page sections
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={resetMutation.isPending}
                data-testid="button-reset-layout"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateMutation.isPending}
                data-testid="button-save-layout"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasChanges && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-600 text-sm">
              You have unsaved changes. Click "Save Changes" to apply them.
            </div>
          )}
          
          <div className="space-y-2">
            {localSections.map((section, index) => (
              <div 
                key={section.id} 
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 rounded-md border transition-all ${
                  section.is_visible 
                    ? "bg-card border-border" 
                    : "bg-muted/50 border-dashed border-muted-foreground/30"
                } ${draggedIndex === index ? "opacity-50 scale-[0.98]" : ""} ${
                  dragOverIndex === index ? "border-primary border-2 bg-primary/5" : ""
                }`}
                data-testid={`layout-section-${section.section_key}`}
              >
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveSection(index, "up")}
                    disabled={index === 0}
                    data-testid={`button-move-up-${section.section_key}`}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveSection(index, "down")}
                    disabled={index === localSections.length - 1}
                    data-testid={`button-move-down-${section.section_key}`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>

                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${!section.is_visible ? "text-muted-foreground" : ""}`}>
                      {section.display_name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {section.section_key}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={section.column_span === 2 ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleColumnSpan(section.id)}
                    title={section.column_span === 2 ? "Full width" : "Half width"}
                    data-testid={`button-toggle-span-${section.section_key}`}
                  >
                    <Columns className="w-4 h-4 mr-1" />
                    {section.column_span === 2 ? "Full" : "Half"}
                  </Button>

                  <Button
                    variant={section.is_visible ? "default" : "outline"}
                    size="icon"
                    onClick={() => toggleVisibility(section.id)}
                    title={section.is_visible ? "Hide section" : "Show section"}
                    data-testid={`button-toggle-visible-${section.section_key}`}
                  >
                    {section.is_visible ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview</CardTitle>
          <CardDescription>
            A simplified preview of how the sections will appear on the BOU home page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="space-y-3">
              {localSections
                .filter(s => s.is_visible)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((section, index, arr) => {
                  // For half-width sections, pair them in a row
                  if (section.column_span === 1) {
                    const prevSection = index > 0 ? arr[index - 1] : null;
                    // If previous section was half-width and this is half-width, 
                    // we're the second in a pair - skip rendering (handled by first)
                    if (prevSection && prevSection.column_span === 1) {
                      // Check if we're the second in this pair
                      const pairIndex = arr.slice(0, index).filter(s => s.column_span === 1).length;
                      if (pairIndex % 2 === 1) return null;
                    }
                    
                    // Find the next half-width section to pair with
                    const nextHalf = arr.slice(index + 1).find(s => s.column_span === 1);
                    
                    return (
                      <div key={section.id} className="grid grid-cols-2 gap-3">
                        <div className="h-12 rounded bg-primary/10 flex items-center justify-center text-sm text-muted-foreground">
                          {section.display_name}
                        </div>
                        {nextHalf && (
                          <div className="h-12 rounded bg-primary/10 flex items-center justify-center text-sm text-muted-foreground">
                            {nextHalf.display_name}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Full-width sections
                  return (
                    <div 
                      key={section.id} 
                      className="h-16 rounded bg-primary/20 flex items-center justify-center text-sm font-medium text-muted-foreground"
                    >
                      {section.display_name}
                    </div>
                  );
                })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BOUNewsletterManager() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data: newsletters = [], isLoading } = useQuery<Newsletter[]>({
    queryKey: [`/api/divisions/bou/admin/newsletters`],
    queryFn: async () => {
      const res = await fetch(`/api/divisions/bou/admin/newsletters`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  const setCurrentMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/divisions/bou/admin/newsletters/${id}/set-current`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/bou/admin/newsletters`] });
      queryClient.invalidateQueries({ queryKey: [`/api/newsletters`] });
      toast({ title: "Newsletter set as current" });
    },
    onError: () => {
      toast({ title: "Failed to set current newsletter", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/divisions/bou/admin/newsletters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/bou/admin/newsletters`] });
      queryClient.invalidateQueries({ queryKey: [`/api/newsletters`] });
      toast({ title: "Newsletter deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete newsletter", variant: "destructive" });
    }
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!newTitle.trim()) {
      toast({ title: "Please enter a title for the newsletter", variant: "destructive" });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", newTitle);
    formData.append("description", newDescription);

    try {
      const response = await fetch(`/api/divisions/bou/admin/newsletters`, {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: [`/api/divisions/bou/admin/newsletters`] });
        queryClient.invalidateQueries({ queryKey: [`/api/newsletters`] });
        setNewTitle("");
        setNewDescription("");
        toast({ title: "Newsletter uploaded successfully" });
      } else {
        throw new Error("Upload failed");
      }
    } catch {
      toast({ title: "Failed to upload newsletter", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (isLoading) {
    return <Card><CardContent className="p-6"><p className="text-muted-foreground">Loading newsletters...</p></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Newsletter
          </CardTitle>
          <CardDescription>
            Upload a new newsletter PDF for BOU. The first uploaded newsletter will automatically be set as current.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input 
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)} 
                placeholder="Newsletter title (e.g., Q4 2024 Newsletter)" 
                data-testid="input-bou-newsletter-title" 
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea 
                value={newDescription} 
                onChange={e => setNewDescription(e.target.value)} 
                placeholder="Brief description of the newsletter contents" 
                rows={2}
                data-testid="input-bou-newsletter-description" 
              />
            </div>
            <div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                className="hidden"
                id="bou-newsletter-upload"
                disabled={uploading || !newTitle.trim()}
              />
              <label htmlFor="bou-newsletter-upload">
                <Button asChild disabled={uploading || !newTitle.trim()}>
                  <span data-testid="button-upload-bou-newsletter">
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload PDF"}
                  </span>
                </Button>
              </label>
              {!newTitle.trim() && (
                <p className="text-xs text-muted-foreground mt-2">Enter a title before uploading</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="w-5 h-5" />
            Newsletters ({newsletters.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {newsletters.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No newsletters uploaded yet. Upload your first newsletter above.</p>
          ) : (
            <div className="space-y-3">
              {newsletters.map(newsletter => (
                <div key={newsletter.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {newsletter.title}
                        {newsletter.is_current && <Badge variant="default" className="text-xs">Current</Badge>}
                      </div>
                      {newsletter.description && (
                        <p className="text-sm text-muted-foreground">{newsletter.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(newsletter.published_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={newsletter.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" data-testid={`button-view-newsletter-${newsletter.id}`}>
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                    </a>
                    {!newsletter.is_current && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentMutation.mutate(newsletter.id)}
                        disabled={setCurrentMutation.isPending}
                        data-testid={`button-set-current-${newsletter.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Set Current
                      </Button>
                    )}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="icon" data-testid={`button-delete-newsletter-${newsletter.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Newsletter</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete "{newsletter.title}"? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button 
                            variant="destructive" 
                            onClick={() => deleteMutation.mutate(newsletter.id)}
                            disabled={deleteMutation.isPending}
                            data-testid="button-confirm-delete"
                          >
                            Delete
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


function BOUNewsManager() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [formData, setFormData] = useState({ title: "", summary: "", content: "" });

  const { data: articles = [], isLoading } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news", "bou", showArchived ? "all" : "active"],
    queryFn: async () => {
      const response = await fetch(`/api/news?division=bou&includeArchived=${showArchived}`);
      if (!response.ok) throw new Error("Failed to fetch articles");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/news", { ...data, division: "bou" });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      setIsCreateDialogOpen(false);
      setFormData({ title: "", summary: "", content: "" });
      toast({ title: "Article created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create article", description: error.message, variant: "destructive" });
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
      setFormData({ title: "", summary: "", content: "" });
      toast({ title: "Article updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update article", description: error.message, variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, isArchived }: { id: number; isArchived: boolean }) => {
      const response = await apiRequest("POST", `/api/news/${id}/archive`, { isArchived });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({ title: "Article archive status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update archive status", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/news/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({ title: "Article deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete article", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (article: NewsArticle) => {
    setEditingArticle(article);
    setFormData({ title: article.title, summary: article.summary, content: article.content });
  };

  if (isLoading) {
    return <Card><CardContent className="p-6"><p className="text-muted-foreground">Loading news articles...</p></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="w-5 h-5" />
              BOU News Articles ({articles.length})
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={showArchived} 
                  onCheckedChange={setShowArchived} 
                  data-testid="switch-show-archived"
                />
                <Label>Show Archived</Label>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-article">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Article
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create News Article</DialogTitle>
                    <DialogDescription>
                      Create a new news article for BOU.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input 
                        value={formData.title} 
                        onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} 
                        placeholder="Article title" 
                        data-testid="input-article-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Summary</Label>
                      <Textarea 
                        value={formData.summary} 
                        onChange={e => setFormData(p => ({ ...p, summary: e.target.value }))} 
                        placeholder="Brief summary..." 
                        rows={2}
                        data-testid="input-article-summary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea 
                        value={formData.content} 
                        onChange={e => setFormData(p => ({ ...p, content: e.target.value }))} 
                        placeholder="Full article content..." 
                        rows={6}
                        data-testid="input-article-content"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={handleSubmit} 
                      disabled={!formData.title || !formData.summary || createMutation.isPending}
                      data-testid="button-submit-article"
                    >
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {articles.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No news articles yet. Create your first article.</p>
          ) : (
            <div className="space-y-3">
              {articles.map(article => (
                <div key={article.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium flex items-center gap-2 flex-wrap">
                        {article.title}
                        {article.is_archived && <Badge variant="secondary" className="text-xs">Archived</Badge>}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{article.summary}</p>
                      <p className="text-xs text-muted-foreground mt-2">{new Date(article.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => openEditDialog(article)} data-testid={`button-edit-article-${article.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Article</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input 
                                value={formData.title} 
                                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} 
                                data-testid="input-edit-article-title"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Summary</Label>
                              <Textarea 
                                value={formData.summary} 
                                onChange={e => setFormData(p => ({ ...p, summary: e.target.value }))} 
                                rows={2}
                                data-testid="input-edit-article-summary"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Content</Label>
                              <Textarea 
                                value={formData.content} 
                                onChange={e => setFormData(p => ({ ...p, content: e.target.value }))} 
                                rows={6}
                                data-testid="input-edit-article-content"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button 
                              onClick={handleSubmit} 
                              disabled={updateMutation.isPending}
                              data-testid="button-save-article"
                            >
                              Save Changes
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => archiveMutation.mutate({ id: article.id, isArchived: !article.is_archived })}
                        disabled={archiveMutation.isPending}
                        title={article.is_archived ? "Unarchive" : "Archive"}
                        data-testid={`button-archive-article-${article.id}`}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="icon" data-testid={`button-delete-article-${article.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete Article</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete "{article.title}"? This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button 
                              variant="destructive" 
                              onClick={() => deleteMutation.mutate(article.id)}
                              disabled={deleteMutation.isPending}
                              data-testid="button-confirm-delete-article"
                            >
                              Delete
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface NewsletterAnalyticsSummary {
  id: string;
  title: string;
  publishedAt: string;
  isCurrent: boolean;
  uniqueViews: number;
  totalViews: number;
}

interface NewsletterAnalyticsDetail {
  id: string;
  uniqueViews: number;
  totalViews: number;
  byDivision: { division: string; uniqueViews: number }[];
  byUser: { userId: string; email: string; firstName: string | null; lastName: string | null; division: string | null; viewCount: number; lastViewed: string }[];
}

const divisionLabels: Record<string, string> = {
  corporate: "Corporate",
  defense: "Defense",
  industrials: "Industrials",
  advanced_programs: "Advanced Programs",
  bou: "Business Operations"
};

function BOUAnalyticsManager() {
  const [selectedNewsletterId, setSelectedNewsletterId] = useState<string | null>(null);
  const [selectedNewsletterTitle, setSelectedNewsletterTitle] = useState<string>("");
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);

  const { data: analyticsData = [], isLoading } = useQuery<NewsletterAnalyticsSummary[]>({
    queryKey: ["/api/newsletters/analytics", "bou"],
    queryFn: async () => {
      const response = await fetch(`/api/newsletters/analytics?division=bou`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  const { data: detailedAnalytics, isLoading: isLoadingDetails } = useQuery<NewsletterAnalyticsDetail>({
    queryKey: ["/api/newsletters", selectedNewsletterId, "analytics"],
    queryFn: async () => {
      if (!selectedNewsletterId) return null;
      const response = await fetch(`/api/newsletters/${selectedNewsletterId}/analytics`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    enabled: !!selectedNewsletterId,
  });

  const openAnalyticsDialog = (item: NewsletterAnalyticsSummary) => {
    setSelectedNewsletterId(item.id);
    setSelectedNewsletterTitle(item.title);
    setAnalyticsDialogOpen(true);
  };

  const totalUniqueViews = analyticsData.reduce((sum, a) => sum + a.uniqueViews, 0);
  const totalViews = analyticsData.reduce((sum, a) => sum + a.totalViews, 0);

  if (isLoading) {
    return <Card><CardContent className="p-6"><div className="flex items-center justify-center py-8"><FileText className="w-6 h-6 animate-pulse text-muted-foreground" /></div></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" />BOU Analytics Dashboard</CardTitle>
          <CardDescription>View engagement metrics for BOU newsletters and content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><FileText className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{analyticsData.length}</p><p className="text-sm text-muted-foreground">Total Newsletters</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Users className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{totalUniqueViews}</p><p className="text-sm text-muted-foreground">Unique Viewers</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Eye className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{totalViews}</p><p className="text-sm text-muted-foreground">Total Views</p></div></div></CardContent></Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Newspaper className="w-5 h-5" />Newsletter Performance</CardTitle>
          <CardDescription>Click on a newsletter to view detailed analytics</CardDescription>
        </CardHeader>
        <CardContent>
          {analyticsData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No newsletters found for BOU. Upload newsletters to see analytics.</div>
          ) : (
            <div className="space-y-3">
              {analyticsData.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer" onClick={() => openAnalyticsDialog(item)} data-testid={`analytics-newsletter-${item.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium truncate">{item.title}</span>
                      {item.isCurrent && <Badge variant="default" className="bg-green-600">Current</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">Published {safeFormatDate(item.publishedAt, "MMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right"><p className="font-semibold">{item.uniqueViews}</p><p className="text-xs text-muted-foreground">Unique</p></div>
                    <div className="text-right"><p className="font-semibold">{item.totalViews}</p><p className="text-xs text-muted-foreground">Total</p></div>
                    <BarChart3 className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={analyticsDialogOpen} onOpenChange={setAnalyticsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" />Newsletter Analytics</DialogTitle>
            <DialogDescription>Viewing statistics for "{selectedNewsletterTitle}"</DialogDescription>
          </DialogHeader>
          {isLoadingDetails ? (
            <div className="flex justify-center py-8"><FileText className="w-8 h-8 animate-pulse text-muted-foreground" /></div>
          ) : detailedAnalytics ? (
            <div className="space-y-6 overflow-hidden flex flex-col flex-1">
              <div className="grid grid-cols-2 gap-4">
                <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Users className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{detailedAnalytics.uniqueViews}</p><p className="text-sm text-muted-foreground">Unique Viewers</p></div></div></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Eye className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{detailedAnalytics.totalViews}</p><p className="text-sm text-muted-foreground">Total Views</p></div></div></CardContent></Card>
              </div>
              {detailedAnalytics.byUser.length > 0 && (
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <h4 className="font-medium mb-3 flex items-center gap-2"><Users className="w-4 h-4" />Individual Viewers ({detailedAnalytics.byUser.length})</h4>
                  <ScrollArea className="flex-1">
                    <div className="space-y-2 pr-4">
                      {detailedAnalytics.byUser.map((user) => (
                        <div key={user.userId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}</p>
                            <p className="text-sm text-muted-foreground">{divisionLabels[user.division || ""] || user.division || "No division"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{user.viewCount} view{user.viewCount !== 1 ? 's' : ''}</p>
                            <p className="text-xs text-muted-foreground">Last: {safeFormatDate(user.lastViewed, "MMM d, h:mm a")}</p>
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
  );
}
