import { 
  type User, 
  type InsertUser, 
  type NewsArticle, 
  type InsertNewsArticle,
  type Newsletter,
  type InsertNewsletter,
  type TripReport,
  type InsertTripReport,
  type TripReportPhoto,
  type Division 
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // News article methods
  getNewsArticles(division?: Division, includeArchived?: boolean): Promise<NewsArticle[]>;
  getNewsArticle(id: string): Promise<NewsArticle | undefined>;
  createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle>;
  updateNewsArticle(id: string, article: Partial<InsertNewsArticle>): Promise<NewsArticle | undefined>;
  archiveNewsArticle(id: string, isArchived: boolean): Promise<NewsArticle | undefined>;
  deleteNewsArticle(id: string): Promise<boolean>;
  
  // Newsletter methods
  getNewsletters(division?: Division): Promise<Newsletter[]>;
  getNewsletter(id: string): Promise<Newsletter | undefined>;
  createNewsletter(newsletter: InsertNewsletter): Promise<Newsletter>;
  deleteNewsletter(id: string): Promise<boolean>;
  
  // Trip Report methods
  getTripReports(searchQuery?: string): Promise<TripReport[]>;
  getTripReport(id: string): Promise<TripReport | undefined>;
  createTripReport(report: InsertTripReport): Promise<TripReport>;
  getTripReportPhotos(tripReportId: string): Promise<TripReportPhoto[]>;
  addTripReportPhoto(tripReportId: string, fileUrl: string, fileName: string): Promise<TripReportPhoto>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private newsArticles: Map<string, NewsArticle>;
  private newsletters: Map<string, Newsletter>;
  private tripReports: Map<string, TripReport>;
  private tripReportPhotos: Map<string, TripReportPhoto>;

  constructor() {
    this.users = new Map();
    this.newsArticles = new Map();
    this.newsletters = new Map();
    this.tripReports = new Map();
    this.tripReportPhotos = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      verificationCode: insertUser.verificationCode ?? null,
      verificationCodeExpiresAt: insertUser.verificationCodeExpiresAt ?? null,
      emailVerified: insertUser.emailVerified ?? false,
      resetPasswordToken: insertUser.resetPasswordToken ?? null,
      resetPasswordTokenExpiresAt: insertUser.resetPasswordTokenExpiresAt ?? null,
      role: insertUser.role ?? "viewer"
    };
    this.users.set(id, user);
    return user;
  }

  // News Article methods
  async getNewsArticles(division?: Division, includeArchived: boolean = false): Promise<NewsArticle[]> {
    let articles = Array.from(this.newsArticles.values());
    
    if (division) {
      articles = articles.filter(a => a.division === division);
    }
    
    if (!includeArchived) {
      articles = articles.filter(a => !a.isArchived);
    }
    
    return articles.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  async getNewsArticle(id: string): Promise<NewsArticle | undefined> {
    return this.newsArticles.get(id);
  }

  async createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle> {
    const id = randomUUID();
    const now = new Date();
    const newArticle: NewsArticle = {
      id,
      division: article.division ?? "corporate",
      title: article.title,
      summary: article.summary,
      content: article.content,
      publishedAt: article.publishedAt ?? now,
      isArchived: article.isArchived ?? false,
      createdBy: article.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.newsArticles.set(id, newArticle);
    return newArticle;
  }

  async updateNewsArticle(id: string, article: Partial<InsertNewsArticle>): Promise<NewsArticle | undefined> {
    const existing = this.newsArticles.get(id);
    if (!existing) return undefined;
    
    const updated: NewsArticle = {
      ...existing,
      ...article,
      updatedAt: new Date(),
    };
    this.newsArticles.set(id, updated);
    return updated;
  }

  async archiveNewsArticle(id: string, isArchived: boolean): Promise<NewsArticle | undefined> {
    return this.updateNewsArticle(id, { isArchived });
  }

  async deleteNewsArticle(id: string): Promise<boolean> {
    return this.newsArticles.delete(id);
  }

  // Newsletter methods
  async getNewsletters(division?: Division): Promise<Newsletter[]> {
    let newsletters = Array.from(this.newsletters.values());
    
    if (division) {
      newsletters = newsletters.filter(n => n.division === division);
    }
    
    return newsletters.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  async getNewsletter(id: string): Promise<Newsletter | undefined> {
    return this.newsletters.get(id);
  }

  async createNewsletter(newsletter: InsertNewsletter): Promise<Newsletter> {
    const id = randomUUID();
    const now = new Date();
    const newNewsletter: Newsletter = {
      id,
      division: newsletter.division ?? "corporate",
      title: newsletter.title,
      description: newsletter.description ?? null,
      fileUrl: newsletter.fileUrl,
      fileName: newsletter.fileName,
      publishedAt: newsletter.publishedAt ?? now,
      uploadedBy: newsletter.uploadedBy ?? null,
      createdAt: now,
    };
    this.newsletters.set(id, newNewsletter);
    return newNewsletter;
  }

  async deleteNewsletter(id: string): Promise<boolean> {
    return this.newsletters.delete(id);
  }

  // Trip Report methods (actual implementation uses SQL in routes.ts)
  async getTripReports(searchQuery?: string): Promise<TripReport[]> {
    let reports = Array.from(this.tripReports.values());
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      reports = reports.filter(r => 
        r.eventName.toLowerCase().includes(query) ||
        r.location.toLowerCase().includes(query) ||
        r.albersPoc.toLowerCase().includes(query)
      );
    }
    
    return reports.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getTripReport(id: string): Promise<TripReport | undefined> {
    return this.tripReports.get(id);
  }

  async createTripReport(report: InsertTripReport): Promise<TripReport> {
    const id = randomUUID();
    const now = new Date();
    const newReport: TripReport = {
      id,
      eventName: report.eventName,
      dateStart: report.dateStart,
      dateEnd: report.dateEnd,
      location: report.location,
      albersPoc: report.albersPoc,
      otherAttendees: report.otherAttendees ?? null,
      justification: report.justification,
      isAttendee: report.isAttendee ?? false,
      isSponsor: report.isSponsor ?? false,
      isPanelist: report.isPanelist ?? false,
      importanceSummary: report.importanceSummary,
      meetingsSummary: report.meetingsSummary,
      sponsorshipSummary: report.sponsorshipSummary ?? null,
      marketingNeeds: report.marketingNeeds ?? null,
      recommendations: report.recommendations,
      shouldReturn: report.shouldReturn ?? true,
      returnType: report.returnType ?? null,
      createdBy: report.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.tripReports.set(id, newReport);
    return newReport;
  }

  async getTripReportPhotos(tripReportId: string): Promise<TripReportPhoto[]> {
    return Array.from(this.tripReportPhotos.values())
      .filter(p => p.tripReportId === tripReportId);
  }

  async addTripReportPhoto(tripReportId: string, fileUrl: string, fileName: string): Promise<TripReportPhoto> {
    const id = randomUUID();
    const photo: TripReportPhoto = {
      id,
      tripReportId,
      fileUrl,
      fileName,
      uploadedAt: new Date(),
    };
    this.tripReportPhotos.set(id, photo);
    return photo;
  }
}

export const storage = new MemStorage();
