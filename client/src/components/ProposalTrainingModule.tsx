import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BookOpen, FileText, Loader2, Video, Presentation, Play, BarChart3, X, Users, Eye } from "lucide-react";
import PDFViewer from "./PDFViewer";
import PDFThumbnail from "./PDFThumbnail";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface User {
  id: string;
  role: string;
}

interface ViewRecord {
  id: string;
  viewed_at: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface AnalyticsData {
  views: ViewRecord[];
  stats: {
    total_views: string;
    unique_viewers: string;
  };
}

import slide1 from "@assets/21_1761771391773.jpg";
import slide2 from "@assets/2_1761771391773.jpg";
import slide3 from "@assets/3_1761771391773.jpg";
import slide4 from "@assets/4_1761771391774.jpg";
import slide5 from "@assets/5_1761771391774.jpg";
import slide6 from "@assets/6_1761771391774.jpg";
import slide7 from "@assets/7_1761771391775.jpg";
import slide8 from "@assets/8_1761771391775.jpg";
import slide9 from "@assets/9_1761771391775.jpg";
import slide10 from "@assets/10_1761771391775.jpg";
import slide11 from "@assets/11_1761771391776.jpg";
import slide12 from "@assets/12_1761771391776.jpg";
import slide13 from "@assets/13_1761771391776.jpg";
import slide14 from "@assets/14_1761771391777.jpg";
import slide15 from "@assets/15_1761771391777.jpg";
import slide16 from "@assets/16_1761771391777.jpg";
import slide17 from "@assets/17_1761771391777.jpg";
import slide18 from "@assets/18_1761771391778.jpg";
import slide19 from "@assets/19_1761771391778.jpg";
import slide20 from "@assets/20_1761771391778.jpg";

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

const DEFAULT_SLIDES = [
  { id: "1", title: "Proposal Chaos Theory", image: slide2 },
  { id: "2", title: "Proposal Process Objectives", image: slide3 },
  { id: "3", title: "The 10 Proposal Process Principles", image: slide4 },
  { id: "4", title: "Overview of Proposal Writing", image: slide5 },
  { id: "5", title: "How is Proposal Writing Different?", image: slide6 },
  { id: "6", title: "The Structure of a Proposal Section", image: slide7 },
  { id: "7", title: "Proposal Writing Challenges", image: slide8 },
  { id: "8", title: "7 Deadly Sins of Proposal Writing", image: slide9 },
  { id: "9", title: "The 7 'Cs' of Proposal Writing", image: slide10 },
  { id: "10", title: "Proposals are scored... Not read", image: slide11 },
  { id: "11", title: "Planning and Pre-Writing", image: slide12 },
  { id: "12", title: "A Proposal Writing Planning Approach", image: slide13 },
  { id: "13", title: "Review the Proposal Pre-Writing Draft", image: slide14 },
  { id: "14", title: "Pre-Writing Best Practices", image: slide15 },
  { id: "15", title: "What About Reusing Content?", image: slide16 },
  { id: "16", title: "Developing Winning Proposal Content", image: slide17 },
  { id: "17", title: "Technical Approach Sections", image: slide18 },
  { id: "18", title: "Subject Matter Expert and Writer Collaboration", image: slide19 },
  { id: "19", title: "Proposal Writing Style Best Practices", image: slide20 },
  { id: "20", title: "Review Recovery", image: slide1 },
];

export default function ProposalTrainingModule() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [selectedSlideForAnalytics, setSelectedSlideForAnalytics] = useState<string | null>(null);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/me"]
  });

  const isAdmin = user?.role === "admin" || user?.role === "bou_admin";

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<TrainingCategory[]>({
    queryKey: ["/api/bou/training-categories"]
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/bou/admin/training-views", selectedSlideForAnalytics],
    queryFn: async () => {
      const res = await fetch(`/api/bou/admin/training-views/${selectedSlideForAnalytics}`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!selectedSlideForAnalytics && isAdmin
  });

  const recordViewMutation = useMutation({
    mutationFn: async (slideId: string) => {
      await apiRequest("POST", "/api/bou/training-views", { slideId });
    }
  });

  const { data: dbSlides = [], isLoading: slidesLoading } = useQuery<TrainingSlide[]>({
    queryKey: selectedCategoryId 
      ? ["/api/bou/training-slides", { categoryId: selectedCategoryId }]
      : ["/api/bou/training-slides"],
    queryFn: async ({ queryKey }) => {
      const url = selectedCategoryId 
        ? `/api/bou/training-slides?categoryId=${selectedCategoryId}`
        : "/api/bou/training-slides";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch slides");
      return res.json();
    },
    enabled: !!selectedCategoryId || categories.length === 0
  });

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    setCurrentSlide(0);
  }, [selectedCategoryId]);

  const isLoading = categoriesLoading || slidesLoading;

  const hasCategories = categories.length > 0;
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const slides = dbSlides.length > 0 
    ? dbSlides.map(s => ({ id: s.id, title: s.title, image: s.file_url, caption: s.caption, fileType: s.file_type || "image" }))
    : (!hasCategories ? DEFAULT_SLIDES.map(s => ({ ...s, caption: "", fileType: "image" as const })) : []);

  // Record view whenever current slide changes (for all navigation methods)
  useEffect(() => {
    const slide = slides[currentSlide];
    if (slide && slide.id && !slide.id.match(/^\d+$/)) {
      recordViewMutation.mutate(slide.id);
    }
  }, [currentSlide, slides.length]);

  const goToPreviousSlide = () => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    // View is recorded by the useEffect when currentSlide changes
  };

  const openAnalytics = (slideId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSlideForAnalytics(slideId);
    setAnalyticsDialogOpen(true);
  };

  const closeAnalytics = () => {
    setAnalyticsDialogOpen(false);
    setSelectedSlideForAnalytics(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 bg-primary/10 rounded-lg flex-shrink-0">
            <Presentation className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">Training</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {selectedCategory?.description || "Training materials and resources"}
            </p>
          </div>
        </div>

        {hasCategories && categories.length > 1 && (
          <Tabs value={selectedCategoryId || ""} onValueChange={setSelectedCategoryId} className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
              {categories.map((category) => (
                <TabsTrigger 
                  key={category.id} 
                  value={category.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-md border border-border/50 bg-card text-foreground shadow-sm transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted/80"
                  data-testid={`tab-category-${category.id}`}
                >
                  <Presentation className="w-4 h-4" />
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {slides.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Presentation className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No training materials available</h3>
              <p className="text-muted-foreground text-sm">
                {hasCategories 
                  ? `No materials have been added to "${selectedCategory?.name}" yet.`
                  : "Check back later for training content."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      {hasCategories ? `${selectedCategory?.name}: ` : ""}Module {currentSlide + 1} of {slides.length}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {slides[currentSlide]?.title}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goToPreviousSlide}
                      disabled={currentSlide === 0}
                      data-testid="button-previous-slide"
                      data-goatcounter-click="bou-training-previous-slide"
                      data-goatcounter-title="Training Previous Slide"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goToNextSlide}
                      disabled={currentSlide === slides.length - 1}
                      data-testid="button-next-slide"
                      data-goatcounter-click="bou-training-next-slide"
                      data-goatcounter-title="Training Next Slide"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-lg p-4">
                  {slides[currentSlide]?.fileType === "image" && (
                    <img
                      src={slides[currentSlide]?.image}
                      alt={slides[currentSlide]?.title}
                      className="w-full h-auto rounded-md shadow-lg"
                      data-testid={`img-slide-${currentSlide + 1}`}
                    />
                  )}
                  {slides[currentSlide]?.fileType === "pdf" && (
                    <div className="w-full" data-testid={`pdf-slide-${currentSlide + 1}`}>
                      <PDFViewer url={slides[currentSlide]?.image} className="rounded-md shadow-lg" />
                    </div>
                  )}
                  {slides[currentSlide]?.fileType === "video" && (
                    <video
                      src={slides[currentSlide]?.image}
                      controls
                      className="w-full h-auto rounded-md shadow-lg"
                      data-testid={`video-slide-${currentSlide + 1}`}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  All Training Materials
                </CardTitle>
                <CardDescription>
                  Click any thumbnail to jump to that item
                </CardDescription>
              </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    "group relative rounded-lg overflow-hidden border-2 transition-all hover-elevate active-elevate-2",
                    currentSlide === index
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border"
                  )}
                  data-testid={`button-slide-${index + 1}`}
                  data-goatcounter-click={`bou-training-jump-to-slide-${index + 1}`}
                  data-goatcounter-title={`Training Jump to Slide ${index + 1}`}
                >
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {slide.fileType === "image" && (
                      <img
                        src={slide.image}
                        alt={slide.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {slide.fileType === "pdf" && (
                      <div className="w-full h-full relative">
                        <PDFThumbnail url={slide.image} title={slide.title} />
                        <div className="absolute bottom-1 right-1 bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          PDF
                        </div>
                      </div>
                    )}
                    {slide.fileType === "video" && (
                      <div className="w-full h-full relative">
                        <video
                          src={slide.image}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                            <Play className="w-5 h-5 text-foreground ml-0.5" />
                          </div>
                        </div>
                        <div className="absolute bottom-1 right-1 bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          Video
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-white text-xs font-medium line-clamp-2">
                        {slide.title}
                      </p>
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                    {index + 1}
                  </div>
                  {isAdmin && !slide.id.match(/^\d+$/) && (
                    <div
                      onClick={(e) => openAnalytics(slide.id, e)}
                      className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm p-1.5 rounded hover-elevate active-elevate-2 cursor-pointer"
                      title="View Analytics"
                      data-testid={`button-analytics-${slide.id}`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && openAnalytics(slide.id, e as any)}
                      data-goatcounter-click={`bou-training-view-analytics-${slide.id}`}
                      data-goatcounter-title="Training View Analytics"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={analyticsDialogOpen} onOpenChange={setAnalyticsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Module Analytics
            </DialogTitle>
            <DialogDescription>
              View history for this training module
            </DialogDescription>
          </DialogHeader>
          
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : analyticsData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Eye className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{analyticsData.stats.total_views}</p>
                        <p className="text-sm text-muted-foreground">Total Views</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{analyticsData.stats.unique_viewers}</p>
                        <p className="text-sm text-muted-foreground">Unique Viewers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">View History</h4>
                <ScrollArea className="h-[300px] border rounded-lg">
                  {analyticsData.views.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No views recorded yet
                    </div>
                  ) : (
                    <div className="divide-y">
                      {analyticsData.views.map((view) => (
                        <div key={view.id} className="flex items-center justify-between p-3">
                          <div>
                            <p className="font-medium">
                              {view.first_name && view.last_name 
                                ? `${view.first_name} ${view.last_name}`
                                : view.email}
                            </p>
                            <p className="text-sm text-muted-foreground">{view.email}</p>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(view.viewed_at), "MMM d, yyyy 'at' h:mm a")}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
