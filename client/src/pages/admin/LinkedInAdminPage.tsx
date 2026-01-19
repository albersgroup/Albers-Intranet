import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ExternalLink, Check, X, Linkedin, RefreshCw, Clock, User } from "lucide-react";
import { safeFormatDate } from "@/lib/utils";
import { SiLinkedin } from "react-icons/si";
import { canEditLinkedIn } from "@/lib/permissions";

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

export default function LinkedInAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<LinkedinPost | null>(null);
  
  const [formData, setFormData] = useState({
    content: "",
    postUrl: "",
    imageUrl: "",
    postedAt: "",
  });

  const isAdmin = canEditLinkedIn(user?.role);

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
    setFormData({
      content: "",
      postUrl: "",
      imageUrl: "",
      postedAt: "",
    });
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
      updateMutation.mutate({ 
        id: editingPost.id, 
        data: { ...formData, isActive: editingPost.isActive } 
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const setAsActive = (post: LinkedinPost) => {
    updateMutation.mutate({
      id: post.id,
      data: {
        content: post.content,
        postUrl: post.postUrl || "",
        imageUrl: post.imageUrl || "",
        postedAt: post.postedAt || "",
        isActive: true,
      }
    });
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page. Only System Administrators can manage LinkedIn posts.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="linkedin-admin-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SiLinkedin className="w-6 h-6 text-[#0A66C2]" />
            LinkedIn Post Sync
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manually sync your latest LinkedIn posts to display on the Corporate homepage
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-sync-new-post">
          <Plus className="w-4 h-4 mr-2" />
          Sync New Post
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to Sync a LinkedIn Post</CardTitle>
          <CardDescription>
            Follow these simple steps to add your latest LinkedIn post to the intranet
          </CardDescription>
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
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="px-2 py-0.5 mt-0.5">4</Badge>
            <p>Optionally add the post URL and any image URL for display</p>
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
            <p className="text-muted-foreground text-sm mb-4">
              Click "Sync New Post" to add your first LinkedIn post
            </p>
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
                    {post.isActive && (
                      <Badge variant="default" className="bg-green-600">
                        <Check className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!post.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAsActive(post)}
                        data-testid={`button-set-active-${post.id}`}
                      >
                        Set as Active
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(post)}
                      data-testid={`button-edit-${post.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" data-testid={`button-delete-${post.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete LinkedIn Post</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this synced post? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(post.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap line-clamp-4 mb-3">{post.content}</p>
                {post.imageUrl && (
                  <img 
                    src={post.imageUrl} 
                    alt="LinkedIn post image" 
                    className="w-full max-w-md h-auto rounded-lg mb-3"
                  />
                )}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  {post.postUrl && (
                    <a 
                      href={post.postUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-primary flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on LinkedIn
                    </a>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Synced {safeFormatDate(post.syncedAt)}
                  </span>
                  {post.syncedByName && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {post.syncedByName}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateDialogOpen || !!editingPost} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingPost(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SiLinkedin className="w-5 h-5 text-[#0A66C2]" />
              {editingPost ? "Edit LinkedIn Post" : "Sync LinkedIn Post"}
            </DialogTitle>
            <DialogDescription>
              {editingPost 
                ? "Update the synced LinkedIn post content"
                : "Paste your LinkedIn post content to display on the Corporate homepage"
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content">Post Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Paste your LinkedIn post content here..."
                className="min-h-[150px]"
                required
                data-testid="input-post-content"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="postUrl">LinkedIn Post URL (optional)</Label>
              <Input
                id="postUrl"
                type="url"
                value={formData.postUrl}
                onChange={(e) => setFormData({ ...formData, postUrl: e.target.value })}
                placeholder="https://www.linkedin.com/posts/..."
                data-testid="input-post-url"
              />
              <p className="text-xs text-muted-foreground">
                Right-click the post and copy link to get the direct URL
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL (optional)</Label>
              <Input
                id="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
                data-testid="input-image-url"
              />
              <p className="text-xs text-muted-foreground">
                If the post has an image, you can paste an image URL here
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="postedAt">Original Post Date (optional)</Label>
              <Input
                id="postedAt"
                type="date"
                value={formData.postedAt}
                onChange={(e) => setFormData({ ...formData, postedAt: e.target.value })}
                data-testid="input-posted-at"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingPost(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-post"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingPost ? "Update Post" : "Sync Post"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
