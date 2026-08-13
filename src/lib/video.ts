export type VideoEmbed =
  | { kind: "youtube"; embedUrl: string }
  | { kind: "vimeo"; embedUrl: string }
  | { kind: "drive"; embedUrl: string }
  | { kind: "file"; url: string };

/** Pulls a Drive file id out of any of Google's share/URL formats. */
function extractDriveFileId(parsed: URL): string | null {
  const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
  if (fileMatch) return fileMatch[1];

  const id = parsed.searchParams.get("id");
  if (id) return id;

  return null;
}

export function resolveVideoEmbed(url: string): VideoEmbed {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    // modestbranding + rel=0: trims YouTube's own branding/outbound chrome as
    // much as their embed API allows (no fully "clean" mode is offered).
    const YOUTUBE_PARAMS = "modestbranding=1&rel=0";
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      if (id) return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${id}?${YOUTUBE_PARAMS}` };
      const shortsMatch = parsed.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/);
      if (shortsMatch) {
        return {
          kind: "youtube",
          embedUrl: `https://www.youtube.com/embed/${shortsMatch[1]}?${YOUTUBE_PARAMS}`,
        };
      }
    }
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1);
      if (id) return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${id}?${YOUTUBE_PARAMS}` };
    }
    if (host === "vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      // `quality` is a starting-quality hint Vimeo honors when the video has a
      // 1080p rendition and the account plan supports it (not a hard
      // guarantee). title/byline/portrait/badge=0 strip Vimeo's own overlay
      // chrome, including the outbound logo link.
      if (id) {
        return {
          kind: "vimeo",
          embedUrl: `https://player.vimeo.com/video/${id}?quality=1080p&title=0&byline=0&portrait=0&badge=0`,
        };
      }
    }
    if (host === "drive.google.com" || host === "docs.google.com") {
      const id = extractDriveFileId(parsed);
      if (id) return { kind: "drive", embedUrl: `https://drive.google.com/file/d/${id}/preview` };
    }
  } catch {
    // fall through to treating it as a direct file URL
  }

  return { kind: "file", url };
}
