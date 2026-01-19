import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, Pencil, Upload, X, AlertTriangle, Loader2, ImageIcon } from "lucide-react";
import type { CustomContentBlock } from "@shared/schema";

interface EditableContentBlockProps {
  division: string;
  blockType: string;
  defaultImage?: string;
  defaultTitle?: string;
  defaultSubtitle?: string;
  defaultContent?: string;
  defaultBadges?: string[];
}

export default function EditableContentBlock({
  division,
  blockType,
  defaultImage,
  defaultTitle = "2025-2027 Strategic Plan",
  defaultSubtitle = "People First - Mission Always",
  defaultContent = "Operating and executing at the speed of relevance. Our strategic priorities focus on innovation, excellence, dedication, and stewardship.",
  defaultBadges = ["Innovation", "Excellence", "Dedication", "Stewardship"]
}: EditableContentBlockProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    content: "",
    imageUrl: "",
    imageName: "",
    badges: [] as string[],
    badgeInput: ""
  });

  const { data: contentBlock, isLoading } = useQuery<CustomContentBlock | null>({
    queryKey: ['/api/content-blocks', division, blockType],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<CustomContentBlock>) => {
      return apiRequest("PUT", `/api/content-blocks/${division}/${blockType}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-blocks', division, blockType] });
      toast({
        title: "Content Saved",
        description: "The content block has been updated successfully."
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save content block",
        variant: "destructive"
      });
    }
  });

  const canEdit = user?.role === "admin" || user?.role === "corporate_admin";

  const displayData = {
    title: contentBlock?.title || defaultTitle,
    subtitle: contentBlock?.subtitle || defaultSubtitle,
    content: contentBlock?.content || defaultContent,
    imageUrl: contentBlock?.imageUrl || defaultImage,
    badges: contentBlock?.badges || defaultBadges
  };

  const openEditDialog = () => {
    setFormData({
      title: displayData.title,
      subtitle: displayData.subtitle || "",
      content: displayData.content,
      imageUrl: displayData.imageUrl || "",
      imageName: contentBlock?.imageName || "",
      badges: Array.isArray(displayData.badges) ? displayData.badges : [],
      badgeInput: ""
    });
    setIsEditing(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (PNG, JPG, GIF, etc.)",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setFormData(prev => ({
        ...prev,
        imageUrl: result.url,
        imageName: file.name
      }));
      toast({
        title: "Image Uploaded",
        description: "Image uploaded successfully"
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const addBadge = () => {
    const badge = formData.badgeInput.trim();
    if (badge && !formData.badges.includes(badge)) {
      setFormData(prev => ({
        ...prev,
        badges: [...prev.badges, badge],
        badgeInput: ""
      }));
    }
  };

  const removeBadge = (badge: string) => {
    setFormData(prev => ({
      ...prev,
      badges: prev.badges.filter(b => b !== badge)
    }));
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for the content block",
        variant: "destructive"
      });
      return;
    }

    saveMutation.mutate({
      title: formData.title,
      subtitle: formData.subtitle,
      content: formData.content,
      imageUrl: formData.imageUrl,
      imageName: formData.imageName,
      badges: formData.badges as unknown as string
    });
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden relative group" data-testid="content-block-strategic-plan">
        {canEdit && (
          <Button
            size="icon"
            variant="default"
            className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={openEditDialog}
            data-testid="button-edit-content-block"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        )}
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {displayData.imageUrl && (
              <div 
                className="md:w-2/5 flex-shrink-0 bg-[#51142a] p-4 flex items-center justify-center cursor-pointer group/img relative"
                onClick={() => setShowImagePreview(true)}
                data-testid="button-content-block-enlarge"
              >
                <img 
                  src={displayData.imageUrl} 
                  alt={displayData.title}
                  className="w-full h-auto max-h-[200px] object-contain rounded transition-transform group-hover/img:scale-105"
                  data-testid="img-content-block"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="text-white text-xs opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/50 px-2 py-1 rounded">
                    Click to enlarge
                  </span>
                </div>
              </div>
            )}
            <div className={`flex-1 p-4 flex flex-col justify-center ${!displayData.imageUrl ? 'w-full' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-base">{displayData.title}</h3>
              </div>
              {displayData.subtitle && (
                <p className="text-lg font-bold text-primary mb-2">{displayData.subtitle}</p>
              )}
              <div 
                className="text-muted-foreground text-xs mb-3 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: displayData.content }}
              />
              {displayData.badges && displayData.badges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(displayData.badges) ? displayData.badges : []).map((badge: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="bg-primary/5 text-xs">
                      {badge}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-4xl p-2 bg-[#51142a]" aria-describedby={undefined}>
          <DialogHeader className="sr-only">
            <DialogTitle>{displayData.title}</DialogTitle>
          </DialogHeader>
          {displayData.imageUrl && (
            <img 
              src={displayData.imageUrl} 
              alt={displayData.title}
              className="w-full h-auto object-contain"
              data-testid="img-content-block-enlarged"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Content Block</DialogTitle>
            <DialogDescription>
              Customize the content block that appears on the Corporate homepage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">CUI Material Warning</p>
                  <p className="mt-1">Do not upload documents containing Controlled Unclassified Information (CUI) or other sensitive material.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., 2025-2027 Strategic Plan"
                data-testid="input-content-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="e.g., People First - Mission Always"
                data-testid="input-content-subtitle"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter the main content text..."
                rows={4}
                data-testid="textarea-content"
              />
              <p className="text-xs text-muted-foreground">
                You can use basic HTML for formatting (bold, italic, links).
              </p>
            </div>

            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex items-center gap-4">
                {formData.imageUrl ? (
                  <div className="relative w-24 h-24 bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={formData.imageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: "", imageName: "" }))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid="button-upload-image"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Image
                      </>
                    )}
                  </Button>
                  {formData.imageName && (
                    <p className="text-xs text-muted-foreground mt-1">{formData.imageName}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Badges / Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.badgeInput}
                  onChange={(e) => setFormData(prev => ({ ...prev, badgeInput: e.target.value }))}
                  placeholder="Add a badge..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addBadge();
                    }
                  }}
                  data-testid="input-badge"
                />
                <Button type="button" variant="outline" onClick={addBadge} data-testid="button-add-badge">
                  Add
                </Button>
              </div>
              {formData.badges.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 p-2 border border-border rounded-md bg-muted/30">
                  {formData.badges.map((badge, idx) => (
                    <Badge key={idx} variant="default" className="pr-1">
                      {badge}
                      <button
                        type="button"
                        className="h-4 w-4 ml-1 rounded-full inline-flex items-center justify-center hover:bg-primary-foreground/20"
                        onClick={() => removeBadge(badge)}
                        aria-label={`Remove ${badge}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
              data-testid="button-save-content"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
