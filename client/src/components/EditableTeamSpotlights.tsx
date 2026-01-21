import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Trophy, Pencil, Upload, X, AlertTriangle, Loader2, Sparkles, Star, Calendar, User } from "lucide-react";
import type { TeamSpotlight } from "@shared/schema";

const SPOTLIGHT_TYPES = ["New Hire", "Promotion", "Work Anniversary", "Achievement"] as const;
type SpotlightType = typeof SPOTLIGHT_TYPES[number];

interface SpotlightFormData {
  spotlightType: SpotlightType;
  name: string;
  role: string;
  department: string;
  context: string;
  imageUrl: string;
  imageName: string;
}

const defaultSpotlight: SpotlightFormData = {
  spotlightType: "New Hire",
  name: "",
  role: "",
  department: "",
  context: "",
  imageUrl: "",
  imageName: ""
};

interface EditableTeamSpotlightsProps {
  division: string;
  defaultSpotlights?: SpotlightFormData[];
}

export default function EditableTeamSpotlights({
  division,
  defaultSpotlights = [
    {
      spotlightType: "New Hire",
      name: "Maria Pichowsky",
      role: "Proposal Coordinator",
      department: "BOU",
      context: "Joined Albers in March and has contributed significantly in Business Intelligence and Proposal Coordination.",
      imageUrl: "",
      imageName: ""
    },
    {
      spotlightType: "Promotion",
      name: "Ryan Flood",
      role: "Proposal Manager",
      department: "BOU",
      context: "Promoted to Proposal Manager after leading several successful proposals in the BOU.",
      imageUrl: "",
      imageName: ""
    },
    {
      spotlightType: "Achievement",
      name: "Innovation Team",
      role: "Q4 Contract Win",
      department: "Albers Innovation",
      context: "Successfully secured a multi-year contract valued at $15M for advanced aerospace systems.",
      imageUrl: "",
      imageName: ""
    }
  ]
}: EditableTeamSpotlightsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<SpotlightFormData[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { data: spotlights, isLoading } = useQuery<TeamSpotlight[]>({
    queryKey: ['/api/team-spotlights', division],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: SpotlightFormData[]) => {
      return apiRequest("PUT", `/api/team-spotlights/${division}`, { spotlights: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team-spotlights', division] });
      toast({
        title: "Spotlights Saved",
        description: "Team spotlights have been updated successfully."
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save team spotlights",
        variant: "destructive"
      });
    }
  });

  const canEdit = user?.role === "admin" || 
    user?.role === "corporate_admin" ||
    user?.role === "defense_admin" ||
    user?.role === "industrials_admin" ||
    user?.role === "advanced_admin";

  const canEditThisDivision = user?.role === "admin" || 
    (division === "corporate" && user?.role === "corporate_admin") ||
    (division === "defense" && user?.role === "defense_admin") ||
    (division === "industrials" && user?.role === "industrials_admin") ||
    (division === "advanced_programs" && user?.role === "advanced_admin");

  const displaySpotlights: SpotlightFormData[] = spotlights && spotlights.length > 0
    ? spotlights.map((s, index) => {
        const defaultImg = defaultSpotlights[index];
        return {
          spotlightType: s.spotlightType as SpotlightType,
          name: s.name,
          role: s.role,
          department: s.department || "",
          context: s.context,
          imageUrl: s.imageUrl || defaultImg?.imageUrl || "",
          imageName: s.imageName || defaultImg?.imageName || ""
        };
      })
    : defaultSpotlights;

  const openEditDialog = () => {
    setFormData([...displaySpotlights]);
    setIsEditing(true);
  };

  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingIndex(index);
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
      setFormData(prev => prev.map((item, i) => 
        i === index ? { ...item, imageUrl: result.url, imageName: file.name } : item
      ));
      toast({
        title: "Image Uploaded",
        description: "Profile image uploaded successfully"
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  const updateSpotlight = (index: number, field: keyof SpotlightFormData, value: string) => {
    setFormData(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const addSpotlight = () => {
    if (formData.length < 3) {
      setFormData(prev => [...prev, { ...defaultSpotlight }]);
    }
  };

  const removeSpotlight = (index: number) => {
    setFormData(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const validSpotlights = formData.filter(s => s.name.trim() && s.role.trim() && s.context.trim());
    if (validSpotlights.length === 0) {
      toast({
        title: "Invalid Data",
        description: "Please add at least one spotlight with name, role, and description.",
        variant: "destructive"
      });
      return;
    }
    saveMutation.mutate(validSpotlights);
  };

  const getSpotlightIcon = (type: string) => {
    switch (type) {
      case "New Hire":
        return <Sparkles className="w-6 h-6 text-emerald-600" />;
      case "Promotion":
        return <Star className="w-6 h-6 text-purple-600" />;
      case "Work Anniversary":
        return <Calendar className="w-6 h-6 text-blue-600" />;
      case "Achievement":
        return <Trophy className="w-6 h-6 text-amber-600" />;
      default:
        return <User className="w-6 h-6 text-muted-foreground" />;
    }
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-lg">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Team Spotlights
            </div>
            {canEditThisDivision && (
              <Button
                variant="ghost"
                size="icon"
                onClick={openEditDialog}
                className="h-8 w-8"
                data-testid="button-edit-spotlights"
                data-goatcounter-click="division-edit-spotlights"
                data-goatcounter-title="Edit Team Spotlights"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {displaySpotlights.map((spotlight, index) => (
            <div 
              key={index} 
              className="flex gap-3 p-3 rounded-lg border border-border/50"
              data-testid={`spotlight-${index}`}
            >
              {spotlight.imageUrl ? (
                <img 
                  src={spotlight.imageUrl} 
                  alt={spotlight.name}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  {getSpotlightIcon(spotlight.spotlightType)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-sm">{spotlight.name}</p>
                  <Badge variant="default" className="text-xs">
                    {spotlight.spotlightType}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {spotlight.role} {spotlight.department && `• ${spotlight.department}`}
                </p>
                {spotlight.context && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {spotlight.context}
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Team Spotlights</DialogTitle>
            <DialogDescription>
              Add up to 3 team spotlights for recognition and achievements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">CUI Material Warning</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Do not upload Controlled Unclassified Information (CUI) marked materials to this system.
              </p>
            </div>

            {formData.map((spotlight, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Spotlight {index + 1}</h4>
                  {formData.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSpotlight(index)}
                      className="text-destructive hover:text-destructive"
                      data-goatcounter-click={`division-spotlight-remove-${index}`}
                      data-goatcounter-title="Remove Spotlight"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`type-${index}`}>Type</Label>
                    <Select
                      value={spotlight.spotlightType}
                      onValueChange={(value) => updateSpotlight(index, 'spotlightType', value)}
                    >
                      <SelectTrigger id={`type-${index}`}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {SPOTLIGHT_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`name-${index}`}>Name</Label>
                    <Input
                      id={`name-${index}`}
                      value={spotlight.name}
                      onChange={(e) => updateSpotlight(index, 'name', e.target.value)}
                      placeholder="Person or team name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`role-${index}`}>Role / Title</Label>
                    <Input
                      id={`role-${index}`}
                      value={spotlight.role}
                      onChange={(e) => updateSpotlight(index, 'role', e.target.value)}
                      placeholder="Job title or achievement"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`department-${index}`}>Department (Optional)</Label>
                    <Input
                      id={`department-${index}`}
                      value={spotlight.department}
                      onChange={(e) => updateSpotlight(index, 'department', e.target.value)}
                      placeholder="BOU, Corporate, etc."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`context-${index}`}>Description</Label>
                  <Textarea
                    id={`context-${index}`}
                    value={spotlight.context}
                    onChange={(e) => updateSpotlight(index, 'context', e.target.value)}
                    placeholder="Brief description of the spotlight"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Profile Image (Optional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Uploaded images will be automatically displayed as circular photos.
                  </p>
                  <div className="flex items-center gap-3">
                    {spotlight.imageUrl ? (
                      <div className="relative">
                        <img
                          src={spotlight.imageUrl}
                          alt="Profile"
                          className="w-16 h-16 rounded-full object-cover border-2 border-border"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border shadow-sm"
                          onClick={() => updateSpotlight(index, 'imageUrl', '')}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                        {getSpotlightIcon(spotlight.spotlightType)}
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={(el) => { fileInputRefs.current[index] = el; }}
                        onChange={(e) => handleImageUpload(index, e)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRefs.current[index]?.click()}
                        disabled={uploadingIndex === index}
                      >
                        {uploadingIndex === index ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Photo
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {formData.length < 3 && (
              <Button
                variant="outline"
                onClick={addSpotlight}
                className="w-full"
                data-goatcounter-click="division-spotlight-add"
                data-goatcounter-title="Add Spotlight"
              >
                Add Another Spotlight
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              data-goatcounter-click="division-spotlight-cancel"
              data-goatcounter-title="Spotlights Cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              data-goatcounter-click="division-spotlight-save"
              data-goatcounter-title="Spotlights Save"
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
