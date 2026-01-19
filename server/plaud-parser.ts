import mammoth from "mammoth";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

// Create a JSDOM instance for server-side DOMPurify
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window as unknown as Window & typeof globalThis);

// Configure DOMPurify to allow safe HTML elements for document display
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'div', 'span', 'p', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'a', 'img',
    'blockquote', 'pre', 'code',
    'sub', 'sup',
  ],
  ALLOWED_ATTR: [
    'class', 'id', 'style',
    'href', 'target', 'rel',
    'src', 'alt', 'width', 'height',
    'colspan', 'rowspan',
  ],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'], // Allow target attribute for links
};

interface ExtractedImage {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

interface ParsedDocumentResult {
  cleanedHtml: string;
  extractedPlaintext: string;
  images: ExtractedImage[];
  // Extracted metadata for optional form fields
  metadata: {
    eventName?: string;
    dateStart?: string;
    dateEnd?: string;
    location?: string;
    otherAttendees?: string;
  };
}

export async function parsePlaudDocument(fileBuffer: Buffer): Promise<ParsedDocumentResult> {
  const images: ExtractedImage[] = [];
  let imageIndex = 0;
  const imageReferences: { placeholder: string; index: number }[] = [];
  
  // Extract HTML with images replaced by placeholders
  const htmlResult = await mammoth.convertToHtml(
    { buffer: fileBuffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        try {
          const imageBuffer = await image.read();
          const contentType = image.contentType || 'image/png';
          const extension = contentType.split('/')[1] || 'png';
          
          const currentIndex = imageIndex++;
          images.push({
            buffer: Buffer.from(imageBuffer),
            contentType,
            extension
          });
          
          // Return placeholder that will be replaced with actual URL later
          return { src: `__IMAGE_PLACEHOLDER_${currentIndex}__` };
        } catch (err) {
          console.error("Error extracting image:", err);
          return { src: "" };
        }
      }),
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1.title:fresh",
        "b => strong",
        "i => em",
        "u => u",
      ]
    }
  );
  
  // Extract plain text for search indexing
  const textResult = await mammoth.extractRawText({ buffer: fileBuffer });
  const plaintext = textResult.value;
  
  // Clean up the HTML - remove empty paragraphs, fix spacing
  let cleanedHtml = htmlResult.value
    .replace(/<p>\s*<\/p>/g, '') // Remove empty paragraphs
    .replace(/<p><br\s*\/?><\/p>/g, '') // Remove paragraphs with only line breaks
    .replace(/\[Insert[^\]]*\]/gi, '') // Remove placeholder text
    .replace(/\n{3,}/g, '\n\n') // Reduce excessive newlines
    .trim();
  
  // Sanitize HTML to prevent XSS attacks
  cleanedHtml = DOMPurify.sanitize(cleanedHtml, DOMPURIFY_CONFIG);
  
  // Add basic styling classes for better display
  cleanedHtml = `<div class="trip-report-content">${cleanedHtml}</div>`;
  
  // Extract metadata from the text
  const metadata = extractMetadata(plaintext);
  
  return {
    cleanedHtml,
    extractedPlaintext: plaintext,
    images,
    metadata
  };
}

function extractMetadata(text: string): ParsedDocumentResult['metadata'] {
  const metadata: ParsedDocumentResult['metadata'] = {};
  
  // Extract title/event name from first line
  const titleMatch = text.match(/^([^\n]+)/);
  if (titleMatch) {
    const title = titleMatch[1]
      .replace(/^\d{2}-\d{2}\s*(Interview|Lecture|Meeting|Conference)?:?\s*/i, "")
      .trim();
    if (title.length > 5 && title.length < 200) {
      metadata.eventName = title;
    }
  }

  // Extract date
  const dateTimeMatch = text.match(/Date\s*Time:\s*(\d{4}-\d{2}-\d{2})/i);
  if (dateTimeMatch) {
    metadata.dateStart = dateTimeMatch[1];
    metadata.dateEnd = dateTimeMatch[1];
  }

  // Extract location
  const locationMatch = text.match(/Location:\s*([^\n]+)/i);
  if (locationMatch) {
    const location = locationMatch[1]
      .replace(/\[Insert Location\]/gi, "")
      .trim();
    if (location.length > 2) {
      metadata.location = location;
    }
  }

  // Extract attendees
  const intervieweeMatch = text.match(/(?:Interviewee|Instructor|Speaker|Presenter|Attendee)s?:\s*([^\n]+)/i);
  if (intervieweeMatch) {
    const attendees = intervieweeMatch[1]
      .replace(/\[Insert.*?\]/gi, "")
      .split(/[;,]/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .join(", ");
    if (attendees.length > 2) {
      metadata.otherAttendees = attendees;
    }
  }

  return metadata;
}

// Utility to replace image placeholders with actual URLs after upload
export function replaceImagePlaceholders(html: string, imageUrls: string[]): string {
  let result = html;
  imageUrls.forEach((url, index) => {
    result = result.replace(`__IMAGE_PLACEHOLDER_${index}__`, url);
  });
  return result;
}
