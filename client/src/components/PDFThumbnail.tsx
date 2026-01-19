import { useState, useEffect } from "react";
import { FileText, Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PDFThumbnailProps {
  url: string;
  title: string;
  className?: string;
}

export default function PDFThumbnail({ url, title, className = "" }: PDFThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      setError(true);
      return;
    }

    const loadThumbnail = async () => {
      try {
        setLoading(true);
        setError(false);

        const loadingTask = pdfjsLib.getDocument(url);
        const pdfDoc = await loadingTask.promise;
        
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 0.5 });
        
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({
            canvasContext: context,
            viewport: viewport,
          } as any).promise;
          
          setThumbnailUrl(canvas.toDataURL());
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error loading PDF thumbnail:", err);
        setError(true);
        setLoading(false);
      }
    };

    loadThumbnail();
  }, [url]);

  if (loading) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-muted ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !thumbnailUrl) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-muted ${className}`}>
        <FileText className="w-8 h-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={thumbnailUrl}
      alt={title}
      className={`w-full h-full object-cover ${className}`}
    />
  );
}
