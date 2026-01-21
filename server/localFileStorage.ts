import { Response } from "express";
import { randomUUID } from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { createReadStream, existsSync } from "fs";
import { lookup as mimeLookup } from "mime-types";

// Base directory for all file storage
const STORAGE_BASE_DIR = process.env.STORAGE_DIR || "/app/storage";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class LocalFileStorageService {
  private storageDir: string;

  constructor() {
    this.storageDir = STORAGE_BASE_DIR;
    this.ensureStorageDirectory();
  }

  private async ensureStorageDirectory() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create storage directory:", error);
    }
  }

  /**
   * Upload a file buffer to local storage
   * @param buffer File buffer to upload
   * @param filename Original filename
   * @param customPath Optional custom path (defaults to random UUID)
   * @returns URL path to access the file
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    customPath?: string
  ): Promise<string> {
    const fileId = customPath || randomUUID();
    const ext = path.extname(filename);
    const safeFilename = `${fileId}${ext}`;
    const filePath = path.join(this.storageDir, safeFilename);

    await fs.writeFile(filePath, buffer);

    // Return URL path that will be used to access the file
    return `/api/files/${safeFilename}`;
  }

  /**
   * Download a file and stream it to the response
   * @param filename Filename to download
   * @param res Express response object
   * @param cacheTtlSec Cache TTL in seconds
   */
  async downloadFile(
    filename: string,
    res: Response,
    cacheTtlSec: number = 3600
  ) {
    const filePath = path.join(this.storageDir, filename);

    if (!existsSync(filePath)) {
      throw new ObjectNotFoundError();
    }

    try {
      const stats = await fs.stat(filePath);
      const mimeType = mimeLookup(filename) || "application/octet-stream";

      res.set({
        "Content-Type": mimeType,
        "Content-Length": stats.size.toString(),
        "Cache-Control": `private, max-age=${cacheTtlSec}`,
      });

      const stream = createReadStream(filePath);

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  /**
   * Delete a file from storage
   * @param filename Filename to delete
   */
  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.storageDir, filename);

    if (!existsSync(filePath)) {
      throw new ObjectNotFoundError();
    }

    await fs.unlink(filePath);
  }

  /**
   * Check if a file exists
   * @param filename Filename to check
   */
  async fileExists(filename: string): Promise<boolean> {
    const filePath = path.join(this.storageDir, filename);
    return existsSync(filePath);
  }

  /**
   * Extract filename from URL path
   * @param urlPath URL path (e.g., "/api/files/abc-123.pdf")
   * @returns Filename
   */
  extractFilename(urlPath: string): string {
    if (urlPath.startsWith("/api/files/")) {
      return urlPath.replace("/api/files/", "");
    }
    // Handle legacy paths if any
    if (urlPath.startsWith("/objects/")) {
      return urlPath.replace("/objects/", "");
    }
    return urlPath;
  }

  /**
   * Normalize object path to new format
   * @param rawPath Raw path from database (could be old GCS URL or new path)
   * @returns Normalized path
   */
  normalizeObjectEntityPath(rawPath: string): string {
    // Handle old Google Cloud Storage URLs
    if (rawPath.startsWith("https://storage.googleapis.com/")) {
      const url = new URL(rawPath);
      const filename = path.basename(url.pathname);
      return `/api/files/${filename}`;
    }

    // Handle old /objects/ paths
    if (rawPath.startsWith("/objects/")) {
      const filename = rawPath.replace("/objects/", "");
      return `/api/files/${filename}`;
    }

    // Already in correct format
    return rawPath;
  }
}

// Export singleton instance
export const localFileStorage = new LocalFileStorageService();
