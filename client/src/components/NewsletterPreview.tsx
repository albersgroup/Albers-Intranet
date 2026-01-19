import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Newspaper, ExternalLink, FileText, Loader2 } from "lucide-react";
import PDFViewer from "./PDFViewer";
import * as pdfjsLib from "pdfjs-dist";
import { apiRequest } from "@/lib/queryClient";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

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

interface NewsletterPreviewProps {
  division: "corporate" | "defense" | "industrials" | "advanced_programs" | "bou";
}

export default function NewsletterPreview({ division }: NewsletterPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { data: newsletter, isLoading, error } = useQuery<Newsletter>({
    queryKey: ["/api/newsletters/current", division],
    queryFn: async () => {
      const response = await fetch(`/api/newsletters/current/${division}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch newsletter");
      }
      return response.json();
    },
  });

  // Track newsletter view when user clicks "Read More"
  const trackViewMutation = useMutation({
    mutationFn: async (newsletterId: string) => {
      await apiRequest("POST", `/api/newsletters/${newsletterId}/view`);
    },
  });

  const handleReadMore = () => {
    if (newsletter?.id) {
      trackViewMutation.mutate(newsletter.id);
    }
    setIsExpanded(true);
  };

  // Load the first page of the PDF as a preview image
  useEffect(() => {
    if (!newsletter?.file_url) {
      setPreviewLoading(false);
      return;
    }

    const loadPreview = async () => {
      try {
        setPreviewLoading(true);
        setPreviewError(null);

        const loadingTask = pdfjsLib.getDocument(newsletter.file_url);
        const pdfDoc = await loadingTask.promise;
        
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 2 }); // Higher scale for better quality
        
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({
            canvasContext: context,
            viewport: viewport,
          } as any).promise;
          
          setPreviewImage(canvas.toDataURL());
        }
        
        setPreviewLoading(false);
      } catch (err) {
        console.error("Error loading PDF preview:", err);
        setPreviewError("Failed to load preview");
        setPreviewLoading(false);
      }
    };

    loadPreview();
  }, [newsletter?.file_url]);

  if (isLoading) {
    return (
      <Card className="overflow-hidden w-full min-h-[400px] flex flex-col" data-testid="newsletter-preview-loading">
        <CardContent className="flex items-center justify-center py-12 flex-1">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error || !newsletter) {
    return (
      <Card className="overflow-hidden w-full h-full min-h-[400px] flex flex-col" data-testid="newsletter-preview-empty">
        <CardContent className="flex flex-col items-center justify-center py-12 flex-1">
          <FileText className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No newsletter available</h3>
          <p className="text-muted-foreground text-center">
            A newsletter for this division will appear here once uploaded by an administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden w-full h-full min-h-[400px] flex flex-col" data-testid="newsletter-preview">
      {!isExpanded ? (
        <>
          {/* Preview of first page with fade effect */}
          <div className="relative">
            {previewLoading ? (
              <div className="flex items-center justify-center py-24 bg-muted">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : previewError ? (
              <div className="flex items-center justify-center py-24 bg-muted">
                <p className="text-muted-foreground">Could not load preview</p>
              </div>
            ) : previewImage ? (
              <div 
                className="relative overflow-hidden"
                style={{ maxHeight: "500px" }}
              >
                <img 
                  src={previewImage} 
                  alt={newsletter.title}
                  className="w-full h-auto"
                  data-testid="newsletter-preview-image"
                />
                {/* Fade out gradient at the bottom */}
                <div 
                  className="absolute bottom-0 left-0 right-0 pointer-events-none"
                  style={{
                    height: "150px",
                    background: "linear-gradient(to bottom, transparent 0%, hsl(var(--card)) 100%)"
                  }}
                />
              </div>
            ) : null}
          </div>
          
          {/* Read More button */}
          <CardContent className="pt-0 pb-4 -mt-8 relative z-10">
            <Button 
              onClick={handleReadMore}
              variant="outline"
              className="w-full gap-2"
              data-testid="button-read-more"
            >
              <Newspaper className="w-4 h-4" />
              Read More...
              <ChevronDown className="w-4 h-4" />
            </Button>
          </CardContent>
        </>
      ) : (
        <>
          {/* Full PDF viewer */}
          <CardContent className="p-0">
            <PDFViewer url={newsletter.file_url} />
          </CardContent>
          <CardContent className="pt-4 pb-4 flex gap-2">
            <Button 
              onClick={() => setIsExpanded(false)}
              variant="outline"
              className="flex-1 gap-2"
              data-testid="button-collapse-newsletter"
            >
              <ChevronUp className="w-4 h-4" />
              Collapse Newsletter
            </Button>
            <a href={newsletter.file_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
              <Button variant="outline" className="gap-2" data-testid="button-download-pdf">
                <ExternalLink className="w-4 h-4" />
                Download PDF
              </Button>
            </a>
          </CardContent>
        </>
      )}
    </Card>
  );
}
