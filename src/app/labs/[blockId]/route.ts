import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessCourse, MAX_LAB_FILE_SIZE } from "@/lib/labs";
import { isBlobUrl } from "@/lib/uploads";

// Serves a lab's HTML for the in-app iframe. Vercel Blob sends .html files
// with Content-Disposition: attachment, so a browser would download the file
// instead of rendering it — the app fetches it server-side and re-serves it
// inline instead, behind sign-in + enrollment.
//
// `Content-Security-Policy: sandbox allow-scripts` gives the document an
// opaque origin even if someone opens this URL directly (no cookies, no
// access to the app). The iframe on the module page repeats the same sandbox.
export async function GET(_request: Request, { params }: { params: Promise<{ blockId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required", { status: 401 });

  const { blockId } = await params;
  const block = await prisma.contentBlock.findUnique({
    where: { id: blockId },
    select: { type: true, fileUrl: true, module: { select: { courseId: true } } },
  });
  if (!block || block.type !== "LAB" || !block.fileUrl) {
    return new Response("Lab not found", { status: 404 });
  }

  if (!(await canAccessCourse(user, block.module.courseId))) {
    return new Response("You're not enrolled in this course", { status: 403 });
  }

  // Only ever fetch files we uploaded ourselves.
  if (!isBlobUrl(block.fileUrl)) return new Response("Lab file unavailable", { status: 502 });

  const upstream = await fetch(block.fileUrl, { cache: "no-store" });
  if (!upstream.ok) return new Response("Lab file unavailable", { status: 502 });
  const html = await upstream.text();
  if (html.length > MAX_LAB_FILE_SIZE * 2) return new Response("Lab file too large", { status: 502 });

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=300",
      "Content-Security-Policy": "sandbox allow-scripts",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
