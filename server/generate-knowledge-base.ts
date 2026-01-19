import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

// Create a pool for database access
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 10000,
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('Database pool error (knowledge-base):', err.message);
});

export async function generateKnowledgeBase(): Promise<string> {
  console.log("🤖 Generating Albers Bot knowledge base...");

  let knowledge = `=== ALBERS AEROSPACE INTRANET KNOWLEDGE BASE ===
Generated: ${new Date().toISOString()}

This is the comprehensive knowledge base for the Albers Aerospace Intranet. Use this information to help employees navigate the platform, find resources, and understand company structure.

== COMPANY OVERVIEW ==
Albers Aerospace is an aerospace and defense company with four main divisions:
1. Albers Corporate - The main corporate division handling company-wide operations
2. Albers Defense - Defense-focused division for military contracts and programs  
3. Albers Industrials - Industrial division for commercial aerospace work
4. Albers Advanced Programs - Special projects and advanced technology programs

== INTRANET STRUCTURE WITH LINKS ==

The intranet is organized into the following main sections. ALWAYS provide clickable links when referencing these!

CORPORATE SECTION:
- [Corporate Home](/) - Main corporate landing page with Strategic Plan and News Bulletin
- [Business Development Hub](/business-development) - Central hub for BD resources and tools
- [SOP Library](/sops) - Standard Operating Procedures for all processes
- [Training](/training) - Interactive training slides on proposal writing
- [Capture Questions](/capture-questions) - 42 questions across Analysis, Intel, and Solution phases
- [Bid/No-Bid Tool](/bid-no-bid) - Decision tool for evaluating opportunities
- [New Business Opportunity Form](/new-opportunity) - Intake form for new opportunities
- [Trip Reports](/trip-reports) - Post-event reports for conferences and travel
- [ClickUp Dashboard](/clickup) - Proposal tracking dashboard
- [Monthly Activity Report](/monthly-activity-report) - Monthly reporting tool
- [Tools and Resources](/tools) - Collection of employee tools and resources
- [Albers Bot](/albers-bot) - AI assistant (that's you!)
- [News Archive](/news-archive) - All historical news articles

BOU (Business Operations Unit) SECTION:
- [BOU Home](/bou) - Business Operations Unit landing page

DEFENSE SECTION:
- [Defense Home](/defense) - Defense division landing page with division-specific news and bulletins

INDUSTRIALS SECTION:
- [Industrials Home](/industrials) - Industrials division landing page with division-specific news

ADVANCED PROGRAMS SECTION:
- [Advanced Programs Home](/special-projects) - Advanced Programs landing page with division-specific news

== KEY FEATURES ==

UNIVERSAL SEARCH (Command Palette):
- Accessible via Ctrl+K or Cmd+K keyboard shortcut
- Searches across all navigation items, pages, tools, and resources
- Integrates with Albers Bot for AI-powered answers
- Categories: Navigation, Business Development, Business Tools, Finance & HR, Divisions

NEWS BULLETIN SYSTEM:
- Each division has its own News Bulletin showing division-specific articles
- Admins can create, edit, and delete news articles
- Articles are categorized by division: corporate, defense, industrials, advanced_programs

NEWSLETTER SYSTEM:
- PDF newsletters can be uploaded and displayed on division pages
- Newsletters feature an expandable preview with full PDF viewing

SOP LIBRARY FEATURES:
- Inline viewing of SOP documents with preserved formatting
- Filterable Table of Contents with category checkboxes
- Categories: Gate Process (maroon), Capture & BD (blue), Proposal Management (emerald), Planning & Execution (amber), Reference Materials (purple)
- Three-way sorting: Most Used, Alphabetical, Category
- Favorite toggle and share functionality

CAPTURE QUESTIONS:
- 42 questions organized into Analysis, Intel, and Solution phases
- Sample answers provided for guidance
- Auto-save functionality saves progress every second
- Completion tracking with visual progress indicators

NEW BUSINESS OPPORTUNITY FORM:
- Comprehensive 21-field intake form
- NAICS code selector with 150+ aerospace/defense codes
- Auto-save and draft restoration
- Email submission to designated recipients

== USER ROLES ==
- System Admin: Full access to all features and all divisions
- Corporate Admin: Can edit content in Corporate division
- Defense Admin: Can edit content in Defense division
- Industrials Admin: Can edit content in Industrials division  
- Advanced Programs Admin: Can edit content in Advanced Programs division
- Viewer: Read-only access to authorized content

== NAVIGATION TIPS ==
- Use the sidebar to navigate between divisions and pages
- The search bar (Ctrl+K) is the fastest way to find anything
- Each division has its own home page with relevant news and resources
- Business Development tools are centralized in the Corporate section

`;

  // Fetch recent news articles to include in knowledge base
  try {
    const result = await pool.query(`
      SELECT title, division, category, summary, created_at 
      FROM news_articles 
      ORDER BY created_at DESC 
      LIMIT 20
    `);

    if (result.rows.length > 0) {
      knowledge += `\n== RECENT NEWS & ANNOUNCEMENTS ==\n`;
      knowledge += `The following are the most recent news articles in the system:\n\n`;
      
      for (const article of result.rows) {
        knowledge += `Title: ${article.title}\n`;
        knowledge += `Division: ${article.division || 'corporate'}\n`;
        knowledge += `Category: ${article.category || 'general'}\n`;
        if (article.summary) {
          knowledge += `Summary: ${article.summary}\n`;
        }
        knowledge += `---\n`;
      }
    }
  } catch (error) {
    console.log("Note: Could not fetch news articles for knowledge base (table may not exist yet)");
  }

  knowledge += `
== HOW TO HELP USERS ==

When users ask questions, ALWAYS include clickable links in your responses!

CRITICAL: Use markdown link format: [Link Text](url)

Common user questions and HOW TO RESPOND (with links!):

- "Where do I find SOPs?" → "You can find all SOPs in the [SOP Library](/sops). What process are you looking for?"

- "How do I submit a new opportunity?" → "Use the [New Business Opportunity Form](/new-opportunity). It sends the info to your CRM Manager."

- "Where's the proposal training?" → "Check out [Training](/training) for all proposal and pricing courses."

- "What are the capture questions?" → "The [Capture Questions form](/capture-questions) has 42 questions in Analysis, Intel, and Solution phases."

- "What is Gate 1?" → "Gate 1 is the Qualification Review. Full details here: [Gate 1 Workflow](/sops?doc=Gate%201%20Workflow%20%E2%80%93%20Qualification%20Review)"

- "How do I search?" → "Press Ctrl+K (or Cmd+K on Mac) to open search, or click the search bar at the top."

- "Where do I submit a trip report?" → "Go to [Trip Reports](/trip-reports) to submit your post-event report."

- "Where's the bid/no-bid tool?" → "The [Bid/No-Bid Tool](/bid-no-bid) helps you evaluate opportunities."

REMEMBER: Every response about a feature or process should include a clickable link to that resource!
`;

  // Write knowledge base to file
  const outputPath = path.join(process.cwd(), "server", "knowledge-base.txt");
  fs.writeFileSync(outputPath, knowledge, "utf-8");
  
  console.log("✅ Knowledge base generated successfully");
  return knowledge;
}

// Export function to get knowledge base content
export function getKnowledgeBase(): string {
  const filePath = path.join(process.cwd(), "server", "knowledge-base.txt");
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "Knowledge base not yet generated. Please restart the server.";
  }
}

// Enhanced knowledge base generator that pulls from all content sources
export async function generateEnhancedKnowledgeBase(updateType: string = "scheduled"): Promise<string> {
  console.log(`🤖 Generating enhanced knowledge base (${updateType})...`);

  let articlesCount = 0;
  let sopsCount = 0;
  let newsCount = 0;
  let bulletinsCount = 0;
  let newslettersCount = 0;
  const sourcesIncluded: string[] = [];

  // Start with base knowledge
  let knowledge = await generateKnowledgeBase();

  // Add custom knowledge articles
  try {
    const articlesResult = await pool.query(`
      SELECT title, content, category, tags
      FROM knowledge_articles
      WHERE is_active = true
      ORDER BY priority DESC, created_at DESC
    `);

    if (articlesResult.rows.length > 0) {
      articlesCount = articlesResult.rows.length;
      sourcesIncluded.push("knowledge_articles");
      knowledge += `\n\n== CUSTOM KNOWLEDGE ARTICLES ==\n`;
      knowledge += `The following are admin-managed knowledge articles:\n\n`;
      
      for (const article of articlesResult.rows) {
        knowledge += `### ${article.title}\n`;
        knowledge += `Category: ${article.category}\n`;
        if (article.tags) {
          knowledge += `Tags: ${article.tags}\n`;
        }
        knowledge += `\n${article.content}\n\n---\n`;
      }
    }
  } catch (error) {
    console.log("Note: Could not fetch knowledge articles");
  }

  // Add division bulletins
  try {
    const bulletinsResult = await pool.query(`
      SELECT title, content, division, created_at
      FROM division_bulletins
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 30
    `);

    if (bulletinsResult.rows.length > 0) {
      bulletinsCount = bulletinsResult.rows.length;
      sourcesIncluded.push("bulletins");
      knowledge += `\n\n== DIVISION BULLETINS ==\n`;
      knowledge += `Recent bulletins from across divisions:\n\n`;
      
      for (const bulletin of bulletinsResult.rows) {
        knowledge += `[${bulletin.division?.toUpperCase() || 'GENERAL'}] ${bulletin.title}\n`;
        knowledge += `${bulletin.content?.substring(0, 500)}...\n\n`;
      }
    }
  } catch (error) {
    console.log("Note: Could not fetch division bulletins");
  }

  // Add SOP summaries with links
  try {
    const { loadSOPDocuments } = await import("./sop-loader");
    const sops = await loadSOPDocuments();
    
    if (sops.length > 0) {
      sopsCount = sops.length;
      sourcesIncluded.push("sops");
      knowledge += `\n\n== SOP DOCUMENTS AVAILABLE ==\n`;
      knowledge += `ALWAYS provide clickable links when mentioning these SOPs:\n\n`;
      
      for (const sop of sops) {
        knowledge += `• [${sop.title}](${sop.url}) - ${sop.category}\n`;
      }
    }
  } catch (error) {
    console.log("Note: Could not load SOP documents");
  }

  // Log the update
  try {
    await pool.query(`
      INSERT INTO knowledge_update_logs 
      (update_type, sources_included, articles_count, sops_count, news_count, bulletins_count, newsletters_count, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'success')
    `, [updateType, JSON.stringify(sourcesIncluded), articlesCount, sopsCount, newsCount, bulletinsCount, newslettersCount]);
  } catch (error) {
    console.error("Failed to log knowledge base update:", error);
  }

  // Write enhanced knowledge base to file
  const outputPath = path.join(process.cwd(), "server", "knowledge-base.txt");
  fs.writeFileSync(outputPath, knowledge, "utf-8");
  
  console.log(`✅ Enhanced knowledge base generated (${articlesCount} articles, ${sopsCount} SOPs, ${bulletinsCount} bulletins)`);
  return knowledge;
}

// Schedule knowledge base updates (call from server startup)
export function scheduleKnowledgeBaseUpdates() {
  // Run updates at 6 AM and 6 PM
  const MORNING_HOUR = 6;
  const EVENING_HOUR = 18;

  const scheduleNextUpdate = () => {
    const now = new Date();
    const nextUpdate = new Date();
    
    // Find the next 6 AM or 6 PM
    if (now.getHours() < MORNING_HOUR) {
      nextUpdate.setHours(MORNING_HOUR, 0, 0, 0);
    } else if (now.getHours() < EVENING_HOUR) {
      nextUpdate.setHours(EVENING_HOUR, 0, 0, 0);
    } else {
      // Next morning
      nextUpdate.setDate(nextUpdate.getDate() + 1);
      nextUpdate.setHours(MORNING_HOUR, 0, 0, 0);
    }

    const msUntilUpdate = nextUpdate.getTime() - now.getTime();
    
    console.log(`📅 Next knowledge base update scheduled for ${nextUpdate.toLocaleString()}`);

    setTimeout(async () => {
      try {
        await generateEnhancedKnowledgeBase("scheduled");
      } catch (error) {
        console.error("Scheduled knowledge base update failed:", error);
      }
      // Schedule the next update
      scheduleNextUpdate();
    }, msUntilUpdate);
  };

  scheduleNextUpdate();
}
