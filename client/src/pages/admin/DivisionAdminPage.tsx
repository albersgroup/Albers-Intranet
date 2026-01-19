import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { safeFormatDate } from "@/lib/utils";
import { canEditDivision, DIVISION_NAMES, getRoleDisplayName } from "@/lib/permissions";
import RichTextEditor from "@/components/RichTextEditor";
import { SiLinkedin } from "react-icons/si";
import {
  LayoutGrid,
  Image,
  Link as LinkIcon,
  Newspaper,
  Megaphone,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Eye,
  EyeOff,
  Columns,
  ExternalLink,
  FileText,
  Pencil,
  Archive,
  ArchiveX,
  ShieldX,
  Building2,
  Shield,
  Factory,
  Sparkles,
  Upload,
  Star,
  Check,
  Clock,
  User,
  RefreshCw,
  BarChart3,
  Users
} from "lucide-react";

interface DivisionAdminPageProps {
  division: string;
  divisionName?: string;
  features?: {
    layout?: boolean;
    hero?: boolean;
    quickLinks?: boolean;
    newsletter?: boolean;
    bulletins?: boolean;
    news?: boolean;
    linkedIn?: boolean;
    analytics?: boolean;
  };
}

interface LayoutSection {
  id: string;
  division: string;
  section_key: string;
  display_name: string;
  sort_order: number;
  column_span: number;
  is_visible: boolean;
}

interface QuickLink {
  id: string;
  division: string;
  link_type: string;
  title: string;
  description: string;
  icon: string;
  url: string;
  sort_order: number;
  is_visible: boolean;
}

interface HeroAsset {
  id: string;
  division: string;
  file_url: string;
  file_name: string;
  alt_text: string | null;
  is_active: boolean;
}

interface Bulletin {
  id: string;
  division: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_published: boolean;
  created_at: string;
  first_name?: string;
  last_name?: string;
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
  published_at: string;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface LinkedinPost {
  id: string;
  content: string;
  postUrl: string | null;
  imageUrl: string | null;
  postedAt: string | null;
  syncedBy: string | null;
  syncedByName: string | null;
  syncedAt: string;
  isActive: boolean;
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

const divisionLabels: Record<string, string> = {
  corporate: "Albers Corporate",
  defense: "Albers Defense",
  industrials: "Albers Industrials",
  advanced_programs: "Albers Advanced Programs",
  bou: "Business Operations Unit",
};

const divisionIcons: Record<string, React.ElementType> = {
  corporate: Building2,
  defense: Shield,
  industrials: Factory,
  advanced_programs: Sparkles,
};

const divisionColors: Record<string, string> = {
  corporate: "text-primary",
  defense: "text-blue-600",
  industrials: "text-amber-600",
  advanced_programs: "text-purple-600",
};

export default function DivisionAdminPage({ 
  division, 
  divisionName,
  features = { layout: true, hero: true, quickLinks: true, newsletter: true, bulletins: true, news: true, linkedIn: false, analytics: true }
}: DivisionAdminPageProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("layout");
  
  const displayName = divisionName || DIVISION_NAMES[division] || division;
  const DivisionIcon = divisionIcons[division] || Building2;
  const canEdit = canEditDivision(user?.role, division);

  if (!canEdit) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <ShieldX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to manage {displayName} content.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 max-w-6xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg bg-muted ${divisionColors[division] || 'text-primary'}`}>
                <DivisionIcon className="w-8 h-8" />
              </div>
              <div>
                <CardTitle className="text-2xl">{displayName} Control Panel</CardTitle>
                <CardDescription className="text-base mt-1">
                  Manage home page content and settings
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              {getRoleDisplayName(user?.role || "viewer")}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <TabsList className="h-auto p-0 bg-transparent gap-2">
            {features.layout && (
              <TabsTrigger 
                value="layout" 
                data-testid="tab-layout"
                className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Layout
              </TabsTrigger>
            )}
            {features.hero && (
              <TabsTrigger 
                value="hero" 
                data-testid="tab-hero"
                className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
              >
                <Image className="w-4 h-4 mr-2" />
                Hero
              </TabsTrigger>
            )}
            {features.quickLinks && (
              <TabsTrigger 
                value="quick-links" 
                data-testid="tab-quick-links"
                className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Quick Links
              </TabsTrigger>
            )}
            {features.newsletter && (
              <TabsTrigger 
                value="newsletter" 
                data-testid="tab-newsletter"
                className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
              >
                <Newspaper className="w-4 h-4 mr-2" />
                Newsletter
              </TabsTrigger>
            )}
            {features.bulletins && (
              <TabsTrigger 
                value="bulletins" 
                data-testid="tab-bulletins"
                className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
              >
                <Megaphone className="w-4 h-4 mr-2" />
                Bulletins
              </TabsTrigger>
            )}
            {features.news && (
              <TabsTrigger 
                value="news" 
                data-testid="tab-news"
                className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
              >
                <FileText className="w-4 h-4 mr-2" />
                News
              </TabsTrigger>
            )}
            {features.linkedIn && (
              <TabsTrigger 
                value="linkedin" 
                data-testid="tab-linkedin"
                className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
              >
                <SiLinkedin className="w-4 h-4 mr-2" />
                LinkedIn
              </TabsTrigger>
            )}
            {features.analytics && (
              <TabsTrigger 
                value="analytics" 
                data-testid="tab-analytics"
                className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {features.layout && (
          <TabsContent value="layout">
            <LayoutManager division={division} divisionName={displayName} />
          </TabsContent>
        )}
        {features.hero && (
          <TabsContent value="hero">
            <HeroManager division={division} divisionName={displayName} />
          </TabsContent>
        )}
        {features.quickLinks && (
          <TabsContent value="quick-links">
            <QuickLinksManager division={division} divisionName={displayName} />
          </TabsContent>
        )}
        {features.newsletter && (
          <TabsContent value="newsletter">
            <NewsletterManager division={division} divisionName={displayName} />
          </TabsContent>
        )}
        {features.bulletins && (
          <TabsContent value="bulletins">
            <BulletinsManager division={division} divisionName={displayName} />
          </TabsContent>
        )}
        {features.news && (
          <TabsContent value="news">
            <NewsManager division={division} divisionName={displayName} />
          </TabsContent>
        )}
        {features.linkedIn && (
          <TabsContent value="linkedin">
            <LinkedInManager />
          </TabsContent>
        )}
        {features.analytics && (
          <TabsContent value="analytics">
            <AnalyticsManager division={division} divisionName={displayName} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function LayoutManager({ division, divisionName }: { division: string; divisionName: string }) {
  const { toast } = useToast();
  const [localSections, setLocalSections] = useState<LayoutSection[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { data: sections = [], isLoading } = useQuery<LayoutSection[]>({
    queryKey: [`/api/divisions/${division}/admin/home-layout`]
  });

  const cloneSections = (items: LayoutSection[]): LayoutSection[] => 
    items.map(s => ({ ...s }));

  if (sections.length > 0 && !initialized) {
    setLocalSections(cloneSections(sections));
    setInitialized(true);
  }
  if (sections.length > 0 && !hasChanges && initialized && JSON.stringify(sections) !== JSON.stringify(localSections)) {
    setLocalSections(cloneSections(sections));
  }

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) setDragOverIndex(index);
  };
  const handleDragLeave = () => setDragOverIndex(null);
  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newSections = cloneSections(localSections);
    const [draggedItem] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, draggedItem);
    newSections.forEach((s, i) => { s.sort_order = i; });
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
      apiRequest("PUT", `/api/divisions/${division}/admin/home-layout`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/admin/home-layout`] });
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/home-layout`] });
      setHasChanges(false);
      setInitialized(false);
      toast({ title: "Layout updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update layout", variant: "destructive" });
    }
  });

  const resetMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/divisions/${division}/admin/home-layout/reset`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/admin/home-layout`] });
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/home-layout`] });
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
    const newSections = cloneSections(localSections);
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    newSections.forEach((s, i) => { s.sort_order = i; });
    setLocalSections(newSections);
    setHasChanges(true);
  };

  const toggleVisibility = (id: string) => {
    setLocalSections(prev => prev.map(s => s.id === id ? { ...s, is_visible: !s.is_visible } : s));
    setHasChanges(true);
  };

  const toggleColumnSpan = (id: string) => {
    setLocalSections(prev => prev.map(s => s.id === id ? { ...s, column_span: s.column_span === 1 ? 2 : 1 } : s));
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

  if (isLoading) {
    return <Card><CardContent className="p-6"><p className="text-muted-foreground">Loading layout...</p></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5" />
              Home Page Layout
            </CardTitle>
            <CardDescription>
              Configure the order, size, and visibility of home page sections
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending} data-testid="button-reset-layout">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending} data-testid="button-save-layout">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasChanges && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-600 text-sm">
            You have unsaved changes. Click "Save" to apply them.
          </div>
        )}
        {localSections.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No layout sections configured.</p>
        ) : (
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
                  section.is_visible ? "bg-card border-border" : "bg-muted/50 border-dashed border-muted-foreground/30"
                } ${draggedIndex === index ? "opacity-50 scale-[0.98]" : ""} ${
                  dragOverIndex === index ? "border-primary border-2 bg-primary/5" : ""
                }`}
                data-testid={`layout-section-${section.section_key}`}
              >
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSection(index, "up")} disabled={index === 0}>
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSection(index, "down")} disabled={index === localSections.length - 1}>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${!section.is_visible ? "text-muted-foreground" : ""}`}>
                      {section.display_name}
                    </span>
                    <Badge variant="outline" className="text-xs">{section.section_key}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={section.column_span === 2 ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleColumnSpan(section.id)}
                    title={section.column_span === 2 ? "Full width" : "Half width"}
                  >
                    <Columns className="w-4 h-4 mr-1" />
                    {section.column_span === 2 ? "Full" : "Half"}
                  </Button>
                  <Button
                    variant={section.is_visible ? "default" : "outline"}
                    size="icon"
                    onClick={() => toggleVisibility(section.id)}
                    title={section.is_visible ? "Hide section" : "Show section"}
                  >
                    {section.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Preview</CardTitle>
        <CardDescription>
          A simplified preview of how the sections will appear on the {divisionName} home page
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="space-y-3">
            {localSections
              .filter(s => s.is_visible)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((section, index, arr) => {
                if (section.column_span === 1) {
                  const prevSection = index > 0 ? arr[index - 1] : null;
                  if (prevSection && prevSection.column_span === 1) {
                    const pairIndex = arr.slice(0, index).filter(s => s.column_span === 1).length;
                    if (pairIndex % 2 === 1) return null;
                  }
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

function HeroManager({ division, divisionName }: { division: string; divisionName: string }) {
  const { toast } = useToast();

  const { data: assets = [], isLoading } = useQuery<HeroAsset[]>({
    queryKey: [`/api/divisions/${division}/admin/hero-assets`]
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/divisions/${division}/admin/hero-assets/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/admin/hero-assets`] });
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/hero-asset`] });
      toast({ title: "Hero image activated" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/divisions/${division}/admin/hero-assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/admin/hero-assets`] });
      toast({ title: "Hero image deleted" });
    }
  });

  if (isLoading) {
    return <Card><CardContent className="p-6"><p className="text-muted-foreground">Loading hero assets...</p></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          Hero Images
        </CardTitle>
        <CardDescription>
          Manage hero banner images for the home page. Upload images using the file upload system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {assets.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No hero images uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {assets.map(asset => (
              <div key={asset.id} className={`relative rounded-lg overflow-hidden border-2 ${asset.is_active ? 'border-primary' : 'border-transparent'}`}>
                <img src={asset.file_url} alt={asset.alt_text || asset.file_name} className="w-full h-32 object-cover" />
                {asset.is_active && (
                  <Badge className="absolute top-2 left-2">Active</Badge>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex justify-between items-center">
                    <span className="text-white text-xs truncate">{asset.file_name}</span>
                    <div className="flex gap-1">
                      {!asset.is_active && (
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:text-white hover:bg-white/20" onClick={() => activateMutation.mutate(asset.id)}>
                          <Eye className="w-3 h-3" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:text-white hover:bg-white/20" onClick={() => deleteMutation.mutate(asset.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickLinksManager({ division, divisionName }: { division: string; divisionName: string }) {
  const { toast } = useToast();
  const [newLink, setNewLink] = useState({ title: "", description: "", url: "", link_type: "internal", icon: "Link" });

  const { data: links = [], isLoading } = useQuery<QuickLink[]>({
    queryKey: [`/api/divisions/${division}/admin/quick-links`]
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newLink) => apiRequest("POST", `/api/divisions/${division}/admin/quick-links`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/admin/quick-links`] });
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/quick-links`] });
      setNewLink({ title: "", description: "", url: "", link_type: "internal", icon: "Link" });
      toast({ title: "Quick link created" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<QuickLink> }) => 
      apiRequest("PUT", `/api/divisions/${division}/admin/quick-links/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/admin/quick-links`] });
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/quick-links`] });
      toast({ title: "Quick link updated" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/divisions/${division}/admin/quick-links/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/admin/quick-links`] });
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/quick-links`] });
      toast({ title: "Quick link deleted" });
    }
  });

  if (isLoading) {
    return <Card><CardContent className="p-6"><p className="text-muted-foreground">Loading quick links...</p></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Quick Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={newLink.title} onChange={e => setNewLink(p => ({ ...p, title: e.target.value }))} placeholder="Link title" data-testid="input-link-title" />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={newLink.url} onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))} placeholder="/path or https://..." data-testid="input-link-url" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Input value={newLink.description} onChange={e => setNewLink(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" data-testid="input-link-description" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newLink.link_type} onValueChange={v => setNewLink(p => ({ ...p, link_type: v }))}>
                <SelectTrigger data-testid="select-link-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => createMutation.mutate(newLink)} disabled={!newLink.title || !newLink.url || createMutation.isPending} data-testid="button-add-link">
                <Plus className="w-4 h-4 mr-2" />
                Add Link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Quick Links ({links.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No quick links added yet.</p>
          ) : (
            <div className="space-y-2">
              {links.map(link => (
                <div key={link.id} className="flex items-center gap-3 p-3 rounded-md border" data-testid={`quick-link-${link.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{link.title}</span>
                      <Badge variant="outline" className="text-xs">{link.link_type}</Badge>
                      {!link.is_visible && <Badge variant="secondary" className="text-xs">Hidden</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => updateMutation.mutate({ id: link.id, data: { is_visible: !link.is_visible } })}>
                      {link.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(link.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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

function NewsletterManager({ division, divisionName }: { division: string; divisionName: string }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data: newsletters = [], isLoading } = useQuery<Newsletter[]>({
    queryKey: [`/api/divisions/${division}/admin/newsletters`],
    queryFn: async () => {
      const res = await fetch(`/api/divisions/${division}/admin/newsletters`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  const setCurrentMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/divisions/${division}/admin/newsletters/${id}/set-current`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/admin/newsletters`] });
      queryClient.invalidateQueries({ queryKey: [`/api/newsletters`] });
      toast({ title: "Newsletter set as current" });
    },
    onError: () => {
      toast({ title: "Failed to set current newsletter", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/divisions/${division}/admin/newsletters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/admin/newsletters`] });
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
      const response = await fetch(`/api/divisions/${division}/admin/newsletters`, {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/admin/newsletters`] });
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
      // Reset file input
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
            Upload a new newsletter PDF for {divisionName}. The first uploaded newsletter will automatically be set as current.
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
                data-testid="input-newsletter-title" 
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea 
                value={newDescription} 
                onChange={e => setNewDescription(e.target.value)} 
                placeholder="Brief description of the newsletter contents" 
                rows={2}
                data-testid="input-newsletter-description" 
              />
            </div>
            <div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                className="hidden"
                id={`newsletter-upload-${division}`}
                disabled={uploading || !newTitle.trim()}
              />
              <label htmlFor={`newsletter-upload-${division}`}>
                <Button asChild disabled={uploading || !newTitle.trim()}>
                  <span data-testid="button-upload-newsletter">
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
            <div className="space-y-2">
              {newsletters.map(newsletter => (
                <div key={newsletter.id} className={`flex items-center gap-3 p-3 rounded-md border ${newsletter.is_current ? 'border-primary bg-primary/5' : ''}`} data-testid={`newsletter-${newsletter.id}`}>
                  <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{newsletter.title}</span>
                      {newsletter.is_current && <Badge>Current</Badge>}
                    </div>
                    {newsletter.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{newsletter.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Published: {safeFormatDate(newsletter.published_at, "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <a href={newsletter.file_url} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost" title="View newsletter">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                    {!newsletter.is_current && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setCurrentMutation.mutate(newsletter.id)}
                        title="Set as current"
                        data-testid={`button-set-current-${newsletter.id}`}
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" data-testid={`button-delete-newsletter-${newsletter.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Newsletter?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. The newsletter "{newsletter.title}" will be permanently deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteMutation.mutate(newsletter.id)} 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

function BulletinsManager({ division, divisionName }: { division: string; divisionName: string }) {
  const { toast } = useToast();
  const [newBulletin, setNewBulletin] = useState({ title: "", content: "", is_pinned: false });

  const { data: bulletins = [], isLoading } = useQuery<Bulletin[]>({
    queryKey: [`/api/divisions/${division}/admin/bulletins`]
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newBulletin) => apiRequest("POST", `/api/divisions/${division}/admin/bulletins`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/admin/bulletins`] });
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/bulletins`] });
      setNewBulletin({ title: "", content: "", is_pinned: false });
      toast({ title: "Bulletin created" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Bulletin> }) => 
      apiRequest("PUT", `/api/divisions/${division}/admin/bulletins/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/admin/bulletins`] });
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/bulletins`] });
      toast({ title: "Bulletin updated" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/divisions/${division}/admin/bulletins/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/admin/bulletins`] });
      queryClient.invalidateQueries({ queryKey: [`/api/divisions/${division}/bulletins`] });
      toast({ title: "Bulletin deleted" });
    }
  });

  if (isLoading) {
    return <Card><CardContent className="p-6"><p className="text-muted-foreground">Loading bulletins...</p></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create Bulletin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={newBulletin.title} onChange={e => setNewBulletin(p => ({ ...p, title: e.target.value }))} placeholder="Bulletin title" data-testid="input-bulletin-title" />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea value={newBulletin.content} onChange={e => setNewBulletin(p => ({ ...p, content: e.target.value }))} placeholder="Bulletin content..." rows={4} data-testid="input-bulletin-content" />
            </div>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={newBulletin.is_pinned} onCheckedChange={v => setNewBulletin(p => ({ ...p, is_pinned: v }))} data-testid="switch-bulletin-pinned" />
                <Label>Pin to top</Label>
              </div>
              <Button onClick={() => createMutation.mutate(newBulletin)} disabled={!newBulletin.title || !newBulletin.content || createMutation.isPending} data-testid="button-create-bulletin">
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Bulletins ({bulletins.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bulletins.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No bulletins created yet.</p>
          ) : (
            <div className="space-y-3">
              {bulletins.map(bulletin => (
                <div key={bulletin.id} className={`p-4 rounded-md border ${bulletin.is_pinned ? 'border-primary bg-primary/5' : ''}`} data-testid={`bulletin-${bulletin.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium">{bulletin.title}</span>
                        {bulletin.is_pinned && <Badge variant="secondary">Pinned</Badge>}
                        {!bulletin.is_published && <Badge variant="outline">Draft</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{bulletin.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        By {bulletin.first_name} {bulletin.last_name} • {safeFormatDate(bulletin.created_at, "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => updateMutation.mutate({ id: bulletin.id, data: { is_pinned: !bulletin.is_pinned } })}>
                        {bulletin.is_pinned ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => updateMutation.mutate({ id: bulletin.id, data: { is_published: !bulletin.is_published } })}>
                        {bulletin.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(bulletin.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
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

function NewsManager({ division, divisionName }: { division: string; divisionName: string }) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [formData, setFormData] = useState({ title: "", summary: "", content: "" });

  const { data: articles = [], isLoading } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news", division, showArchived ? "all" : "active"],
    queryFn: async () => {
      const response = await fetch(`/api/news?division=${division}&includeArchived=${showArchived}`);
      if (!response.ok) throw new Error("Failed to fetch articles");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/news", { ...data, division });
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
      await apiRequest("DELETE", `/api/news/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({ title: "Article deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete article", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (article: NewsArticle) => {
    setEditingArticle(article);
    setFormData({ title: article.title, summary: article.summary, content: article.content });
  };

  const handleSubmit = () => {
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return <Card><CardContent className="p-6"><p className="text-muted-foreground">Loading news articles...</p></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <CardTitle>News Articles</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showArchived ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              data-testid="button-toggle-archived"
            >
              {showArchived ? "Hide Archived" : "Show Archived"}
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2" data-testid="button-create-article">
                  <Plus className="w-4 h-4" />
                  New Article
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create News Article</DialogTitle>
                  <DialogDescription>Create a new article for {divisionName}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Article title" data-testid="input-title" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="summary">Summary</Label>
                    <Textarea id="summary" value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} placeholder="Brief summary of the article" rows={2} data-testid="input-summary" />
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <RichTextEditor content={formData.content} onChange={(content) => setFormData({ ...formData, content })} placeholder="Full article content" />
                  </div>
                  <Button onClick={handleSubmit} disabled={createMutation.isPending} className="w-full" data-testid="button-submit-article">
                    {createMutation.isPending ? "Creating..." : "Create Article"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {articles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No articles found. Create your first article to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <Card key={article.id} className={article.is_archived ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold truncate">{article.title}</h3>
                        {article.is_archived && <Badge variant="secondary">Archived</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{article.summary}</p>
                      <p className="text-xs text-muted-foreground">Published {safeFormatDate(article.published_at, "MMM d, yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Dialog open={editingArticle?.id === article.id} onOpenChange={(open) => { if (!open) { setEditingArticle(null); setFormData({ title: "", summary: "", content: "" }); } }}>
                        <DialogTrigger asChild>
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(article)} data-testid={`button-edit-${article.id}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Article</DialogTitle>
                            <DialogDescription>Update the article details</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-title">Title</Label>
                              <Input id="edit-title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} data-testid="input-edit-title" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-summary">Summary</Label>
                              <Textarea id="edit-summary" value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} rows={2} data-testid="input-edit-summary" />
                            </div>
                            <div className="space-y-2">
                              <Label>Content</Label>
                              <RichTextEditor content={formData.content} onChange={(content) => setFormData({ ...formData, content })} placeholder="Full article content" />
                            </div>
                            <Button onClick={handleSubmit} disabled={updateMutation.isPending} className="w-full" data-testid="button-save-article">
                              {updateMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button size="icon" variant="ghost" onClick={() => archiveMutation.mutate({ id: article.id, isArchived: !article.is_archived })} data-testid={`button-archive-${article.id}`}>
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
                            <AlertDialogTitle>Delete Article?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone. The article will be permanently deleted.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(article.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LinkedInManager() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<LinkedinPost | null>(null);
  
  const [formData, setFormData] = useState({
    content: "",
    postUrl: "",
    imageUrl: "",
    postedAt: "",
  });

  const { data: posts = [], isLoading } = useQuery<LinkedinPost[]>({
    queryKey: ["/api/linkedin/posts"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/linkedin/posts", {
        content: data.content,
        postUrl: data.postUrl || null,
        imageUrl: data.imageUrl || null,
        postedAt: data.postedAt || null,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/latest"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "LinkedIn post synced successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to sync post", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> & { isActive?: boolean } }) => {
      const response = await apiRequest("PUT", `/api/linkedin/posts/${id}`, {
        content: data.content,
        postUrl: data.postUrl || null,
        imageUrl: data.imageUrl || null,
        postedAt: data.postedAt || null,
        isActive: data.isActive,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/latest"] });
      setEditingPost(null);
      resetForm();
      toast({ title: "LinkedIn post updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update post", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/linkedin/posts/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/latest"] });
      toast({ title: "LinkedIn post deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete post", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ content: "", postUrl: "", imageUrl: "", postedAt: "" });
  };

  const openEditDialog = (post: LinkedinPost) => {
    setFormData({
      content: post.content,
      postUrl: post.postUrl || "",
      imageUrl: post.imageUrl || "",
      postedAt: post.postedAt ? post.postedAt.split('T')[0] : "",
    });
    setEditingPost(post);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data: { ...formData, isActive: editingPost.isActive } });
    } else {
      createMutation.mutate(formData);
    }
  };

  const setAsActive = (post: LinkedinPost) => {
    updateMutation.mutate({
      id: post.id,
      data: { content: post.content, postUrl: post.postUrl || "", imageUrl: post.imageUrl || "", postedAt: post.postedAt || "", isActive: true }
    });
  };

  return (
    <div className="space-y-6" data-testid="linkedin-manager">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <SiLinkedin className="w-5 h-5 text-[#0A66C2]" />
                LinkedIn Post Sync
              </CardTitle>
              <CardDescription>Manually sync LinkedIn posts to display on the Corporate homepage</CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-sync-new-post">
              <Plus className="w-4 h-4 mr-2" />
              Sync New Post
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="px-2 py-0.5 mt-0.5">1</Badge>
            <p>Go to your <a href="https://www.linkedin.com/company/albers-aerospace/posts/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">LinkedIn company page <ExternalLink className="w-3 h-3" /></a></p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="px-2 py-0.5 mt-0.5">2</Badge>
            <p>Copy the text content of your latest post</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="px-2 py-0.5 mt-0.5">3</Badge>
            <p>Click "Sync New Post" and paste the content</p>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <SiLinkedin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No LinkedIn Posts Synced Yet</h3>
            <p className="text-muted-foreground text-sm">Click "Sync New Post" to add your first LinkedIn post</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className={post.isActive ? "border-primary" : ""} data-testid={`linkedin-post-${post.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <SiLinkedin className="w-5 h-5 text-[#0A66C2]" />
                    {post.isActive && <Badge variant="default" className="bg-green-600"><Check className="w-3 h-3 mr-1" />Active</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    {!post.isActive && <Button size="sm" variant="outline" onClick={() => setAsActive(post)} data-testid={`button-set-active-${post.id}`}>Set as Active</Button>}
                    <Button size="icon" variant="ghost" onClick={() => openEditDialog(post)} data-testid={`button-edit-linkedin-${post.id}`}><Pencil className="w-4 h-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost" data-testid={`button-delete-linkedin-${post.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete LinkedIn Post</AlertDialogTitle>
                          <AlertDialogDescription>Are you sure you want to delete this synced post?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(post.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap line-clamp-4 mb-3">{post.content}</p>
                {post.imageUrl && <img src={post.imageUrl} alt="LinkedIn post" className="w-full max-w-md h-auto rounded-lg mb-3" />}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  {post.postUrl && <a href={post.postUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary flex items-center gap-1"><ExternalLink className="w-3 h-3" />View on LinkedIn</a>}
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Synced {safeFormatDate(post.syncedAt)}</span>
                  {post.syncedByName && <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.syncedByName}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateDialogOpen || !!editingPost} onOpenChange={(open) => { if (!open) { setIsCreateDialogOpen(false); setEditingPost(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><SiLinkedin className="w-5 h-5 text-[#0A66C2]" />{editingPost ? "Edit LinkedIn Post" : "Sync LinkedIn Post"}</DialogTitle>
            <DialogDescription>{editingPost ? "Update the synced post content" : "Paste your LinkedIn post content"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin-content">Post Content *</Label>
              <Textarea id="linkedin-content" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="Paste your LinkedIn post content..." className="min-h-[150px]" required data-testid="input-linkedin-content" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin-postUrl">LinkedIn Post URL (optional)</Label>
              <Input id="linkedin-postUrl" type="url" value={formData.postUrl} onChange={(e) => setFormData({ ...formData, postUrl: e.target.value })} placeholder="https://www.linkedin.com/posts/..." data-testid="input-linkedin-url" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin-imageUrl">Image URL (optional)</Label>
              <Input id="linkedin-imageUrl" type="url" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="https://..." data-testid="input-linkedin-image" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin-postedAt">Original Post Date (optional)</Label>
              <Input id="linkedin-postedAt" type="date" value={formData.postedAt} onChange={(e) => setFormData({ ...formData, postedAt: e.target.value })} data-testid="input-linkedin-date" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsCreateDialogOpen(false); setEditingPost(null); resetForm(); }}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-linkedin">
                {(createMutation.isPending || updateMutation.isPending) && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                {editingPost ? "Update Post" : "Sync Post"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnalyticsManager({ division, divisionName }: { division: string; divisionName: string }) {
  const [selectedNewsletterId, setSelectedNewsletterId] = useState<string | null>(null);
  const [selectedNewsletterTitle, setSelectedNewsletterTitle] = useState<string>("");
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);

  const { data: analyticsData = [], isLoading } = useQuery<NewsletterAnalyticsSummary[]>({
    queryKey: ["/api/newsletters/analytics", division],
    queryFn: async () => {
      const response = await fetch(`/api/newsletters/analytics?division=${division}`, { credentials: "include" });
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
    return <Card><CardContent className="p-6"><div className="flex items-center justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" />{divisionName} Analytics Dashboard</CardTitle>
          <CardDescription>View engagement metrics for newsletters and content</CardDescription>
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
            <div className="text-center py-8 text-muted-foreground">No newsletters found for {divisionName}. Upload newsletters to see analytics.</div>
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
            <div className="flex justify-center py-8"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : detailedAnalytics ? (
            <div className="space-y-6 overflow-hidden flex flex-col flex-1">
              <div className="grid grid-cols-2 gap-4">
                <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Users className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{detailedAnalytics.uniqueViews}</p><p className="text-sm text-muted-foreground">Unique Viewers</p></div></div></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Eye className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{detailedAnalytics.totalViews}</p><p className="text-sm text-muted-foreground">Total Views</p></div></div></CardContent></Card>
              </div>
              {detailedAnalytics.byDivision.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2"><Building2 className="w-4 h-4" />Views by Division</h4>
                  <div className="space-y-2">
                    {detailedAnalytics.byDivision.map((div) => (
                      <div key={div.division} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">{divisionLabels[div.division] || div.division || "Unassigned"}</span>
                        <Badge variant="outline">{div.uniqueViews} viewers</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
