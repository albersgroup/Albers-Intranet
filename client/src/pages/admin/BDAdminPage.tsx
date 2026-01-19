import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { isBdAdmin } from "@/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { safeFormatDate } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Link as LinkIcon, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Edit, 
  Image, 
  Upload, 
  CheckCircle,
  Briefcase,
  Save,
  Eye,
  EyeOff,
  FileText,
  LayoutGrid,
  Newspaper,
  Target,
  Settings
} from "lucide-react";

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

interface LayoutSection {
  id: string;
  section_key: string;
  display_name: string;
  sort_order: number;
  column_span: number;
  is_visible: boolean;
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
  "Link", "ExternalLink", "LayoutDashboard", "FileText", 
  "BarChart3", "CheckSquare", "Target", "TrendingUp", 
  "ClipboardCheck", "FilePlus2", "Briefcase", "Building2", "Plane", "Newspaper"
];

const DEFAULT_LAYOUT: LayoutSection[] = [
  { id: "1", section_key: "hero", display_name: "Hero Banner", sort_order: 0, column_span: 2, is_visible: true },
  { id: "2", section_key: "idiq_cta", display_name: "IDIQ Management CTA", sort_order: 1, column_span: 2, is_visible: true },
  { id: "3", section_key: "news", display_name: "BD News & Updates", sort_order: 2, column_span: 1, is_visible: true },
  { id: "4", section_key: "newsletter", display_name: "BD Newsletter", sort_order: 3, column_span: 1, is_visible: true },
  { id: "5", section_key: "bd_tools", display_name: "BD Tools", sort_order: 4, column_span: 1, is_visible: true },
  { id: "6", section_key: "external_systems", display_name: "External Systems", sort_order: 5, column_span: 1, is_visible: true },
];

export default function BDAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  if (!user || !isBdAdmin(user.role)) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">You need BD Control Panel permissions to access this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">BD Control Panel</h1>
        <p className="text-muted-foreground">Manage Business Development configurable content</p>
      </div>

      <Tabs defaultValue="layout" className="space-y-4">
        <TabsList className="h-auto p-0 bg-transparent gap-2 flex flex-wrap">
          <TabsTrigger 
            value="layout" 
            data-testid="tab-bd-layout"
            className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Layout
          </TabsTrigger>
          <TabsTrigger 
            value="hero" 
            data-testid="tab-bd-hero"
            className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
          >
            <Image className="w-4 h-4 mr-2" />
            Hero
          </TabsTrigger>
          <TabsTrigger 
            value="quick-links" 
            data-testid="tab-bd-quick-links"
            className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            Quick Links
          </TabsTrigger>
          <TabsTrigger 
            value="news" 
            data-testid="tab-bd-news"
            className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
          >
            <Newspaper className="w-4 h-4 mr-2" />
            News
          </TabsTrigger>
          <TabsTrigger 
            value="idiq" 
            data-testid="tab-bd-idiq"
            className="px-4 py-2 rounded-md border data-[state=inactive]:bg-background data-[state=inactive]:text-foreground data-[state=inactive]:border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
          >
            <Target className="w-4 h-4 mr-2" />
            IDIQ Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="layout" className="space-y-4">
          <LayoutTab />
        </TabsContent>

        <TabsContent value="hero" className="space-y-4">
          <HeroTab />
        </TabsContent>

        <TabsContent value="quick-links" className="space-y-4">
          <QuickLinksTab />
        </TabsContent>

        <TabsContent value="news" className="space-y-4">
          <NewsTab />
        </TabsContent>

        <TabsContent value="idiq" className="space-y-4">
          <IDIQSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LayoutTab() {
  const { toast } = useToast();
  const [sections, setSections] = useState<LayoutSection[]>(DEFAULT_LAYOUT);

  const toggleVisibility = (id: string) => {
    setSections(prev => prev.map(s => 
      s.id === id ? { ...s, is_visible: !s.is_visible } : s
    ));
  };

  const moveSection = (id: string, direction: "up" | "down") => {
    setSections(prev => {
      const index = prev.findIndex(s => s.id === id);
      if (index === -1) return prev;
      if (direction === "up" && index === 0) return prev;
      if (direction === "down" && index === prev.length - 1) return prev;
      
      const newSections = [...prev];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [newSections[index], newSections[swapIndex]] = [newSections[swapIndex], newSections[index]];
      return newSections.map((s, i) => ({ ...s, sort_order: i }));
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5" />
          Page Layout Configuration
        </CardTitle>
        <CardDescription>
          Arrange and toggle visibility of sections on the BD Home page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {sections.sort((a, b) => a.sort_order - b.sort_order).map((section, index) => (
            <div 
              key={section.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                section.is_visible ? "bg-card" : "bg-muted/50 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5"
                    onClick={() => moveSection(section.id, "up")}
                    disabled={index === 0}
                  >
                    <span className="text-xs">▲</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5"
                    onClick={() => moveSection(section.id, "down")}
                    disabled={index === sections.length - 1}
                  >
                    <span className="text-xs">▼</span>
                  </Button>
                </div>
                <div>
                  <p className="font-medium">{section.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {section.column_span === 2 ? "Full width" : "Half width"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={section.is_visible}
                  onCheckedChange={() => toggleVisibility(section.id)}
                />
                {section.is_visible ? (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          ))}
        </div>
        <Button onClick={() => toast({ title: "Layout saved", description: "Page layout has been updated" })}>
          <Save className="w-4 h-4 mr-2" />
          Save Layout
        </Button>
      </CardContent>
    </Card>
  );
}

function HeroTab() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    toast({ title: "Hero image upload", description: "This feature will be connected to backend storage" });
    setIsUploading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          Hero Image Management
        </CardTitle>
        <CardDescription>
          Upload and manage the hero banner image for the BD Home page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Drag and drop an image here, or click to browse
          </p>
          <Input
            type="file"
            accept="image/*"
            className="hidden"
            id="hero-upload"
            onChange={handleUpload}
            disabled={isUploading}
          />
          <label htmlFor="hero-upload">
            <Button variant="outline" asChild disabled={isUploading}>
              <span>
                {isUploading ? "Uploading..." : "Choose Image"}
              </span>
            </Button>
          </label>
        </div>
        <p className="text-sm text-muted-foreground">
          Recommended size: 1920x400 pixels. Supports JPG, PNG, WebP formats.
        </p>
      </CardContent>
    </Card>
  );
}

function QuickLinksTab() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    url: "",
    icon: "Link",
    link_type: "internal" as "internal" | "external"
  });

  const defaultLinks: QuickLink[] = [
    { id: "1", link_type: "internal", title: "IDIQ Management Portal", description: "AI-scored task order opportunities", icon: "Target", url: "/idiq-management", sort_order: 0, is_visible: true },
    { id: "2", link_type: "internal", title: "New Opportunity Form", description: "Submit new business opportunities", icon: "FilePlus2", url: "/new-opportunity", sort_order: 1, is_visible: true },
    { id: "3", link_type: "internal", title: "Bid / No-Bid", description: "Opportunity evaluation tool", icon: "ClipboardCheck", url: "/bid-no-bid", sort_order: 2, is_visible: true },
    { id: "4", link_type: "external", title: "Business Intelligence Tool", description: "Business intelligence reports", icon: "BarChart3", url: "/api/easy-bi-reports", sort_order: 0, is_visible: true },
  ];

  const handleSave = () => {
    toast({ title: "Link saved", description: "Quick link has been updated" });
    setShowAddDialog(false);
    setEditingLink(null);
    setFormData({ title: "", description: "", url: "", icon: "Link", link_type: "internal" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                Internal Links (BD Tools)
              </CardTitle>
              <CardDescription>
                Links to internal BD pages and tools
              </CardDescription>
            </div>
            <Button onClick={() => { setFormData({ ...formData, link_type: "internal" }); setShowAddDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Link
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {defaultLinks.filter(l => l.link_type === "internal").map(link => (
              <div key={link.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">{link.title}</p>
                  <p className="text-sm text-muted-foreground">{link.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{link.url}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => setEditingLink(link)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                External Links
              </CardTitle>
              <CardDescription>
                Links to external systems and platforms
              </CardDescription>
            </div>
            <Button onClick={() => { setFormData({ ...formData, link_type: "external" }); setShowAddDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Link
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {defaultLinks.filter(l => l.link_type === "external").map(link => (
              <div key={link.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">{link.title}</p>
                  <p className="text-sm text-muted-foreground">{link.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{link.url}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => setEditingLink(link)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog || !!editingLink} onOpenChange={(open) => { 
        if (!open) { setShowAddDialog(false); setEditingLink(null); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLink ? "Edit Link" : "Add New Link"}</DialogTitle>
            <DialogDescription>
              {formData.link_type === "internal" ? "Add a link to an internal BD page" : "Add a link to an external system"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input 
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Link title"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div>
              <Label>URL</Label>
              <Input 
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder={formData.link_type === "internal" ? "/page-path" : "https://..."}
              />
            </div>
            <div>
              <Label>Icon</Label>
              <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ICONS.map(icon => (
                    <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); setEditingLink(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewsTab() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    content: ""
  });

  const sampleNews: NewsArticle[] = [
    { id: 1, division: "bd", title: "Q4 Pipeline Review", summary: "Quarterly review of business development pipeline", content: "", is_archived: false, created_at: new Date().toISOString() },
    { id: 2, division: "bd", title: "New IDIQ Award", summary: "Albers wins new $50M IDIQ contract", content: "", is_archived: false, created_at: new Date().toISOString() },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="w-5 h-5" />
              BD News Management
            </CardTitle>
            <CardDescription>
              Manage news articles for the BD Home page
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Article
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sampleNews.map(article => (
            <div key={article.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-medium">{article.title}</p>
                <p className="text-sm text-muted-foreground">{article.summary}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={article.is_archived ? "secondary" : "default"}>
                  {article.is_archived ? "Archived" : "Published"}
                </Badge>
                <Button variant="ghost" size="icon">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add News Article</DialogTitle>
            <DialogDescription>
              Create a new news article for the BD section
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input 
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Article title"
              />
            </div>
            <div>
              <Label>Summary</Label>
              <Input 
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Brief summary"
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea 
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Full article content"
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => { toast({ title: "Article saved" }); setShowAddDialog(false); }}>
              <Save className="w-4 h-4 mr-2" />
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function IDIQSettingsTab() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    globalThreshold: 70,
    autoArchiveDays: 30,
    emailNotifications: true
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          IDIQ Portal Settings
        </CardTitle>
        <CardDescription>
          Configure global settings for the IDIQ Management Portal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Global Scrub Threshold (%)</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Opportunities below this match score will not be stored in the system
          </p>
          <div className="flex items-center gap-4">
            <Input 
              type="number" 
              min={0} 
              max={100} 
              value={settings.globalThreshold}
              onChange={(e) => setSettings({ ...settings, globalThreshold: parseInt(e.target.value) || 0 })}
              className="w-24"
            />
            <span className="text-muted-foreground">%</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Auto-Archive After (days)</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Opportunities older than this will be automatically archived
          </p>
          <div className="flex items-center gap-4">
            <Input 
              type="number" 
              min={1} 
              max={365} 
              value={settings.autoArchiveDays}
              onChange={(e) => setSettings({ ...settings, autoArchiveDays: parseInt(e.target.value) || 30 })}
              className="w-24"
            />
            <span className="text-muted-foreground">days</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Email Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Enable email alerts for high-match opportunities
            </p>
          </div>
          <Switch
            checked={settings.emailNotifications}
            onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
          />
        </div>

        <Button onClick={() => toast({ title: "Settings saved", description: "IDIQ settings have been updated" })}>
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
