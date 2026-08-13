import { Button } from "@/components/ui/button";
import { buildLinkedInAddCertificateUrl } from "@/lib/linkedin";

function LinkedInGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.03-1.85-3.03-1.86 0-2.14 1.45-2.14 2.94v5.66H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}

export function AddToLinkedInButton({
  courseName,
  certNumber,
  publicId,
  issuedAt,
}: {
  courseName: string;
  certNumber: string;
  publicId: string;
  issuedAt: Date;
}) {
  const url = buildLinkedInAddCertificateUrl({ courseName, certNumber, publicId, issuedAt });

  return (
    <Button
      render={<a href={url} target="_blank" rel="noopener noreferrer" />}
      nativeButton={false}
      variant="outline"
      size="sm"
    >
      <LinkedInGlyph />
      Add to LinkedIn
    </Button>
  );
}
