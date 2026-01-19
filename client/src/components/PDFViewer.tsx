import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string;
  className?: string;
}

export default function PDFViewer({ url, className = "" }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<HTMLCanvasElement[]>([]);

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const loadingTask = pdfjsLib.getDocument(url);
        const pdfDoc = await loadingTask.promise;
        
        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        
        const canvases: HTMLCanvasElement[] = [];
        
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
              canvasContext: context,
              viewport: viewport,
            } as any).promise;
            
            canvases.push(canvas);
          }
        }
        
        setRenderedPages(canvases);
        setLoading(false);
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError("Failed to load PDF document");
        setLoading(false);
      }
    };

    loadPDF();
  }, [url]);

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center p-12 bg-card ${className}`} style={{ minHeight: "400px" }}>
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-12 bg-card ${className}`} style={{ minHeight: "300px" }}>
        <p className="text-destructive mb-4">{error}</p>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button variant="outline">Open PDF in New Tab</Button>
        </a>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div 
        ref={containerRef}
        className="overflow-auto bg-card flex flex-col items-center gap-4 py-4"
        style={{ maxHeight: "80vh" }}
        data-testid="pdf-viewer-container"
      >
        {renderedPages.map((canvas, index) => (
          <div 
            key={index}
            className="shadow-lg"
            style={{ 
              transform: `scale(${scale / 1.5})`,
              transformOrigin: "top center",
              marginBottom: scale < 1 ? `-${(1 - scale / 1.5) * canvas.height}px` : 0
            }}
          >
            <img 
              src={canvas.toDataURL()} 
              alt={`Page ${index + 1}`}
              className="max-w-full"
              data-testid={`pdf-page-${index + 1}`}
            />
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-center gap-2 p-3 bg-card border-t">
        <Button 
          size="icon" 
          variant="ghost"
          onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
          disabled={scale <= 0.5}
          data-testid="button-zoom-out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm text-muted-foreground min-w-[60px] text-center">
          {Math.round(scale * 100 / 1.5)}%
        </span>
        <Button 
          size="icon" 
          variant="ghost"
          onClick={() => setScale(s => Math.min(3, s + 0.25))}
          disabled={scale >= 3}
          data-testid="button-zoom-in"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <span className="text-sm text-muted-foreground ml-4">
          {totalPages} page{totalPages !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
