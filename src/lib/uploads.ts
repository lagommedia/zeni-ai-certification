import "server-only";
import { del, put } from "@vercel/blob";
import path from "path";
import { randomUUID } from "crypto";

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_FILE_SIZE = 500 * 1024 * 1024; // 500MB

/** Uploads a File to Vercel Blob under a random name; returns its public URL and original filename. */
export async function saveUploadedFile(
  file: File,
  maxBytes: number = DEFAULT_MAX_FILE_SIZE
): Promise<{ url: string; name: string }> {
  if (file.size > maxBytes) {
    throw new Error(`File is too large — ${Math.round(maxBytes / (1024 * 1024))}MB max`);
  }

  const ext = path.extname(file.name).slice(0, 20);
  const storedName = `${randomUUID()}${ext}`;
  const blob = await put(storedName, file, { access: "public", addRandomSuffix: false });

  return { url: blob.url, name: file.name };
}

function isBlobUrl(url: string) {
  try {
    return new URL(url).hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Best-effort delete of a previously uploaded file — a stale reference shouldn't block the DB write.
 *  Only deletes our own Blob-hosted files; external URLs (YouTube/Vimeo/Drive links an admin pasted
 *  in) are left alone. */
export async function deleteUploadedFile(url: string | null | undefined) {
  if (!url || !isBlobUrl(url)) return;
  await del(url).catch(() => {});
}
