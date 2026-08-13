import Image from "next/image";
import { format } from "date-fns";
import { CertificateSeal } from "@/components/certificate-seal";

export function CertificateCard({
  recipientName,
  courseTitle,
  courseCategory,
  issuedAt,
  certNumber,
}: {
  recipientName: string;
  courseTitle: string;
  courseCategory: string;
  issuedAt: Date;
  certNumber: string;
}) {
  return (
    <div className="certificate-card w-full overflow-hidden rounded-2xl border border-sapphire/15 bg-card shadow-lg">
      {/* Dark hero band — Zeni's verified dark-hero gradient + flow-lines pattern */}
      <div
        className="relative flex flex-col items-center gap-3 overflow-hidden px-10 pb-10 pt-9 text-center"
        style={{ backgroundImage: "var(--gradient-hero-dark)" }}
      >
        <Image src="/brand/zeni-logo-dark-bg.svg" alt="Zeni" width={96} height={28} className="relative z-10" />
        <div className="relative z-10 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-jade">
          <span className="size-1.5 shrink-0 rounded-full bg-gold" />
          Certificate of Completion
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative pattern; width must be forced inline per the asset's known render-width quirk */}
        <img
          src="/brand/flow-lines.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{ width: "100%", height: "auto" }}
        />
      </div>

      {/* Light content */}
      <div className="flex flex-col items-center gap-6 px-10 py-12 text-center">
        <CertificateSeal size={64} />

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">This certifies that</p>
          <h1 className="text-h3 font-medium text-onyx">{recipientName}</h1>
          <p className="text-sm text-muted-foreground">has successfully completed</p>
          <h2 className="text-h6 font-medium text-sapphire">{courseTitle}</h2>
          <span className="mt-1 w-fit rounded-full bg-jade-light px-3 py-1 text-xs font-medium text-sapphire-dark">
            {courseCategory}
          </span>
        </div>

        <div className="flex w-full max-w-sm items-center justify-between border-t pt-5 text-sm text-muted-foreground">
          <span>Issued {format(issuedAt, "MMMM d, yyyy")}</span>
          <span className="font-mono text-xs">{certNumber}</span>
        </div>
      </div>
    </div>
  );
}
