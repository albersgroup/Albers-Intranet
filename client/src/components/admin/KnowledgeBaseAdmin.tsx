import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Loader2, RefreshCw, Clock, FileText, Brain, Search, CheckCircle, AlertCircle, Download } from "lucide-react";
import { format } from "date-fns";

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeUpdateLog {
  id: string;
  updateType: string;
  sourcesIncluded: string;
  articlesCount: number;
  sopsCount: number;
  newsCount: number;
  bulletinsCount: number;
  newslettersCount: number;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: "company_info", label: "Company Information" },
  { value: "business_development", label: "Business Development" },
  { value: "processes", label: "Processes & Workflows" },
  { value: "policies", label: "Policies & Guidelines" },
  { value: "training", label: "Training & Onboarding" },
  { value: "faq", label: "Frequently Asked Questions" },
  { value: "terminology", label: "Terms & Definitions" },
  { value: "contacts", label: "Key Contacts" },
  { value: "general", label: "General" },
];

const CATEGORY_COLORS: Record<string, string> = {
  company_info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  business_development: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  processes: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  policies: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  training: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  faq: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  terminology: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  contacts: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  general: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
};

export default function KnowledgeBaseAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formTags, setFormTags] = useState("");
  const [formPriority, setFormPriority] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  const { data: articles, isLoading } = useQuery<KnowledgeArticle[]>({
    queryKey: ["/api/admin/knowledge-articles"],
  });

  const { data: updateLogs, isLoading: logsLoading } = useQuery<KnowledgeUpdateLog[]>({
    queryKey: ["/api/admin/knowledge-update-logs"],
  });

  const createArticleMutation = useMutation({
    mutationFn: async (data: Partial<KnowledgeArticle>) => {
      return apiRequest("POST", "/api/admin/knowledge-articles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-articles"] });
      resetForm();
      setIsAddDialogOpen(false);
      toast({
        title: "Article Created",
        description: "Knowledge article has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create article. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateArticleMutation = useMutation({
    mutationFn: async (data: { id: string } & Partial<KnowledgeArticle>) => {
      return apiRequest("PATCH", `/api/admin/knowledge-articles/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-articles"] });
      resetForm();
      setEditingArticle(null);
      toast({
        title: "Article Updated",
        description: "Knowledge article has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update article. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/knowledge-articles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-articles"] });
      toast({
        title: "Article Deleted",
        description: "Knowledge article has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete article. Please try again.",
        variant: "destructive",
      });
    },
  });

  const regenerateKnowledgeBaseMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/knowledge-base/regenerate");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-update-logs"] });
      toast({
        title: "Knowledge Base Updated",
        description: "The bot's knowledge base has been regenerated with all current content.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to regenerate knowledge base. Please try again.",
        variant: "destructive",
      });
    },
  });

  const importContentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/knowledge-articles/import");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-update-logs"] });
      toast({
        title: "Content Imported",
        description: data.message || "All existing SOPs, newsletters, and training materials have been imported.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to import content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async (type?: string) => {
      const url = type ? `/api/admin/knowledge-articles?type=${type}` : "/api/admin/knowledge-articles";
      const response = await apiRequest("DELETE", url);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-articles"] });
      toast({
        title: "Articles Deleted",
        description: `Deleted ${data.deleted || 0} knowledge articles.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete articles. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormCategory("general");
    setFormTags("");
    setFormPriority(0);
    setFormIsActive(true);
  };

  const handleEdit = (article: KnowledgeArticle) => {
    setEditingArticle(article);
    setFormTitle(article.title);
    setFormContent(article.content);
    setFormCategory(article.category);
    setFormTags(article.tags || "");
    setFormPriority(article.priority);
    setFormIsActive(article.isActive);
  };

  const handleSubmit = () => {
    const data = {
      title: formTitle,
      content: formContent,
      category: formCategory,
      tags: formTags,
      priority: formPriority,
      isActive: formIsActive,
    };

    if (editingArticle) {
      updateArticleMutation.mutate({ id: editingArticle.id, ...data });
    } else {
      createArticleMutation.mutate(data);
    }
  };

  const filteredArticles = articles?.filter((article) => {
    const matchesSearch = 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (article.tags?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || article.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const lastUpdate = updateLogs?.[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Knowledge Articles
                </CardTitle>
                <CardDescription>
                  Manage custom knowledge that Albers Bot uses to answer questions
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {(articles?.length || 0) > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete ALL knowledge articles? This cannot be undone.")) {
                        deleteAllMutation.mutate(undefined);
                      }
                    }}
                    disabled={deleteAllMutation.isPending}
                    data-testid="button-delete-all"
                  >
                    {deleteAllMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete All
                  </Button>
                )}
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForm(); setEditingArticle(null); }} data-testid="button-add-article">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Article
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Knowledge Article</DialogTitle>
                    <DialogDescription>
                      Create a new knowledge article for Albers Bot to learn from
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g., What is Gate 1?"
                        data-testid="input-article-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        placeholder="Detailed explanation or answer..."
                        rows={8}
                        data-testid="input-article-content"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={formCategory} onValueChange={setFormCategory}>
                          <SelectTrigger data-testid="select-article-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority (0-10)</Label>
                        <Input
                          id="priority"
                          type="number"
                          min={0}
                          max={10}
                          value={formPriority}
                          onChange={(e) => setFormPriority(parseInt(e.target.value) || 0)}
                          data-testid="input-article-priority"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        value={formTags}
                        onChange={(e) => setFormTags(e.target.value)}
                        placeholder="e.g., gate, process, qualification"
                        data-testid="input-article-tags"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="active"
                        checked={formIsActive}
                        onCheckedChange={setFormIsActive}
                        data-testid="switch-article-active"
                      />
                      <Label htmlFor="active">Active (include in knowledge base)</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={!formTitle || !formContent || createArticleMutation.isPending}
                      data-testid="button-save-article"
                    >
                      {createArticleMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Article"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-articles"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48" data-testid="select-filter-category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArticles?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          {articles?.length === 0 
                            ? "No knowledge articles yet. Add your first article to get started."
                            : "No articles match your search."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredArticles?.map((article) => (
                        <TableRow key={article.id} data-testid={`row-article-${article.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{article.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {article.content.substring(0, 100)}...
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={CATEGORY_COLORS[article.category] || CATEGORY_COLORS.general}>
                              {getCategoryLabel(article.category)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {article.isActive ? (
                              <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-slate-400 text-slate-600">
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleEdit(article)}
                                    data-testid={`button-edit-article-${article.id}`}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Edit Knowledge Article</DialogTitle>
                                    <DialogDescription>
                                      Update this knowledge article
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-title">Title</Label>
                                      <Input
                                        id="edit-title"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        data-testid="input-edit-article-title"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-content">Content</Label>
                                      <Textarea
                                        id="edit-content"
                                        value={formContent}
                                        onChange={(e) => setFormContent(e.target.value)}
                                        rows={8}
                                        data-testid="input-edit-article-content"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-category">Category</Label>
                                        <Select value={formCategory} onValueChange={setFormCategory}>
                                          <SelectTrigger data-testid="select-edit-article-category">
                                            <SelectValue placeholder="Select category" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {CATEGORIES.map((cat) => (
                                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-priority">Priority</Label>
                                        <Input
                                          id="edit-priority"
                                          type="number"
                                          min={0}
                                          max={10}
                                          value={formPriority}
                                          onChange={(e) => setFormPriority(parseInt(e.target.value) || 0)}
                                          data-testid="input-edit-article-priority"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-tags">Tags</Label>
                                      <Input
                                        id="edit-tags"
                                        value={formTags}
                                        onChange={(e) => setFormTags(e.target.value)}
                                        data-testid="input-edit-article-tags"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        id="edit-active"
                                        checked={formIsActive}
                                        onCheckedChange={setFormIsActive}
                                        data-testid="switch-edit-article-active"
                                      />
                                      <Label htmlFor="edit-active">Active</Label>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      onClick={handleSubmit}
                                      disabled={!formTitle || !formContent || updateArticleMutation.isPending}
                                      data-testid="button-update-article"
                                    >
                                      {updateArticleMutation.isPending ? (
                                        <>
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                          Updating...
                                        </>
                                      ) : (
                                        "Update Article"
                                      )}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteArticleMutation.mutate(article.id)}
                                disabled={deleteArticleMutation.isPending}
                                data-testid={`button-delete-article-${article.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Knowledge Base Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lastUpdate ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {lastUpdate.status === "success" ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    )}
                    <span className="font-medium">
                      {lastUpdate.status === "success" ? "Up to Date" : "Partial Update"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last updated: {format(new Date(lastUpdate.createdAt), "MMM d, h:mm a")}
                  </p>
                  <div className="text-sm space-y-1">
                    <p>Sources included:</p>
                    <ul className="text-muted-foreground ml-4 space-y-0.5">
                      <li>{lastUpdate.articlesCount} knowledge articles</li>
                      <li>{lastUpdate.sopsCount} SOPs</li>
                      <li>{lastUpdate.newsCount} news articles</li>
                      <li>{lastUpdate.bulletinsCount} bulletins</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No updates recorded yet</p>
              )}
              
              <Button
                className="w-full"
                onClick={() => regenerateKnowledgeBaseMutation.mutate()}
                disabled={regenerateKnowledgeBaseMutation.isPending}
                data-testid="button-regenerate-knowledge"
              >
                {regenerateKnowledgeBaseMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate Now
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Auto-updates run at 6 AM and 6 PM daily
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Content Sources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Custom Knowledge Articles
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  SOP Documents
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  News & Announcements
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Division Bulletins
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Training Materials
                </li>
              </ul>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => importContentMutation.mutate()}
                disabled={importContentMutation.isPending}
                data-testid="button-import-content"
              >
                {importContentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Import Existing Content
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Imports SOPs, newsletters & training into articles
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
