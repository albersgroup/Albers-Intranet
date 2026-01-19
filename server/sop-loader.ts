import { join } from "path";
import mammoth from "mammoth";

export interface SOPDocument {
  title: string;
  category: string;
  content: string;
  filename: string;
  url: string;
}

// Map of SOP documents in attached_assets
const sopFiles: Record<string, { title: string; category: string }> = {
  "Gate 1 Workflow_1761675747228.docx": {
    title: "Gate 1 Workflow – Qualification Review",
    category: "Gate Process"
  },
  "Gate 1-3 Workflow_1761675749542.docx": {
    title: "Gates 1-3 Complete Workflow",
    category: "Gate Process"
  },
  "Stakeholder Routing and Approval Gates 1-3 _1761676623410.docx": {
    title: "Stakeholder Routing & Approval – Gates 1, 2, and 3",
    category: "Gate Process"
  },
  "Target Phase Execution_1761676656642.docx": {
    title: "Target Phase Execution – Shaping & Gate 2",
    category: "Capture Process"
  },
  "Capture Phase Execution_1761675739077.docx": {
    title: "Capture Phase Execution",
    category: "Capture Process"
  },
  "9 - Bid_No-Bid_1761675613056.docx": {
    title: "Bid/No-Bid Decision Framework",
    category: "Decision Process"
  },
  "No-bid Decsion & Risk Flagging_1761675761388.docx": {
    title: "No-Bid Decision & Risk Flagging",
    category: "Decision Process"
  },
  "9 - Proposal Phase Execution_1761675613057.docx": {
    title: "Proposal Phase Execution",
    category: "Proposal Process"
  },
  "9 - Kickoff & Brief_1761675613057.docx": {
    title: "Proposal Kickoff & Brief",
    category: "Proposal Process"
  },
  "Strategic BD S&BD Pipeline_1761676654264.docx": {
    title: "Strategic BD Pipeline – Using Salesforce",
    category: "Strategic Planning"
  },
  "AOP Process_1761675731042.docx": {
    title: "Annual Operating Plan (AOP)",
    category: "Strategic Planning"
  },
  "B&P Management_1761675735374.docx": {
    title: "B&P Management",
    category: "Resource Management"
  },
  "Global Trade Compliance_1761675752510.docx": {
    title: "Global Trade Compliance",
    category: "Compliance"
  },
  "Oportunity Entry & Notification_1761675763779.docx": {
    title: "Opportunity Entry & Notification",
    category: "Intake Process"
  },
  "Monthly Discover Phase Triage_1761675759340.docx": {
    title: "Monthly Discover Phase Triage",
    category: "Process Management"
  },
  "Vertical Specific Differences_1761676658675.docx": {
    title: "Vertical-Specific Differences",
    category: "Guidance"
  },
  "Opportunity Types_1761675766028.docx": {
    title: "Opportunity Types",
    category: "Reference"
  },
  "Key Roles and Responsabilities_1761675757053.docx": {
    title: "Key Roles and Responsibilities",
    category: "Reference"
  },
  "Introduction_1761675754747.docx": {
    title: "BOU Process Introduction",
    category: "Reference"
  },
  "SOP_BOU_Proposal Management_APR25_GJ_v1_1761675628699.docx": {
    title: "Complete Proposal Management SOP",
    category: "Proposal Process"
  }
};

async function extractHtmlFromDocx(filepath: string): Promise<string> {
  try {
    // Use mammoth to convert .docx to HTML to preserve formatting
    const result = await mammoth.convertToHtml({ path: filepath });
    return result.value;
  } catch (error) {
    console.error(`Error reading ${filepath}:`, error);
    return "";
  }
}

export async function loadSOPDocuments(): Promise<SOPDocument[]> {
  const documents: SOPDocument[] = [];
  
  for (const [filename, metadata] of Object.entries(sopFiles)) {
    try {
      const filepath = join(process.cwd(), "attached_assets", filename);
      const content = await extractHtmlFromDocx(filepath);
      
      if (content) {
        const encodedTitle = encodeURIComponent(metadata.title);
        documents.push({
          title: metadata.title,
          category: metadata.category,
          content,
          filename,
          url: `/sops?doc=${encodedTitle}`
        });
      }
    } catch (error) {
      console.error(`Failed to load ${filename}:`, error);
    }
  }
  
  return documents;
}

export async function getSOPByTitle(title: string): Promise<SOPDocument | null> {
  const documents = await loadSOPDocuments();
  return documents.find(doc => doc.title === title) || null;
}

export async function getSOPContext(): Promise<string> {
  const documents = await loadSOPDocuments();
  
  let context = `You are a BOU (Business Operations Unit) Training Assistant for Albers Aerospace. You help BD Managers, Capture Managers, and Proposal Managers understand our internal processes, SOPs, and best practices.

=== AVAILABLE SOPs WITH LINKS ===
When referencing an SOP, ALWAYS include a clickable link using markdown format: [SOP Title](url)

`;

  for (const doc of documents) {
    context += `• "${doc.title}" (${doc.category}) → Link: ${doc.url}\n`;
  }

  context += `\n=== SOP CONTENT DETAILS ===\n`;

  for (const doc of documents) {
    context += `\n\n=== ${doc.title} (${doc.category}) ===\n`;
    context += `Link: ${doc.url}\n\n`;
    context += doc.content.substring(0, 2500); // Limit each doc to avoid token limits
    context += "\n[Content truncated for brevity]";
  }

  context += `\n\n=== LINKING INSTRUCTIONS ===
CRITICAL: When you mention any SOP or process document, ALWAYS provide a clickable link!

Format: [Document Title](url)

Examples of good responses:
- "Gate 1 is the Qualification Review. You can find all the details here: [Gate 1 Workflow – Qualification Review](/sops?doc=Gate%201%20Workflow%20%E2%80%93%20Qualification%20Review)"
- "For the complete capture process, check out [Capture Phase Execution](/sops?doc=Capture%20Phase%20Execution)"

NEVER just mention an SOP without providing the link. Users should be able to click and go directly to the document.`;

  return context;
}
