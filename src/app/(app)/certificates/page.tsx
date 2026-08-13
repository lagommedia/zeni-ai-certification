import Link from "next/link";
import { format } from "date-fns";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Award, BookOpen } from "lucide-react";
import { CertificateSeal } from "@/components/certificate-seal";

export default async function CertificatesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const certificates = await prisma.certificate.findMany({
    where: { userId: user.id },
    include: { course: true },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h4 font-medium text-sapphire">Certificates</h1>
        <p className="text-sm text-muted-foreground">
          {certificates.length === 0
            ? "Complete a course to earn your first certificate."
            : `You've earned ${certificates.length} certificate${certificates.length === 1 ? "" : "s"}.`}
        </p>
      </div>

      {certificates.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card py-16 text-center">
          <Award className="size-10 text-muted-foreground" />
          <p className="font-medium">No certificates yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Finish every module in a course to automatically earn a certificate here.
          </p>
          <Link
            href="/courses"
            className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <BookOpen className="size-4" />
            Browse courses
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {certificates.map((cert) => (
            <Link
              key={cert.id}
              href={`/certificates/${cert.id}`}
              className="group flex flex-col gap-3 overflow-hidden rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <CertificateSeal size={40} />
                <Badge variant="secondary">{cert.course.category}</Badge>
              </div>
              <h3 className="font-semibold leading-snug group-hover:text-sapphire">
                {cert.course.title}
              </h3>
              <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                <span>Issued {format(cert.issuedAt, "MMM d, yyyy")}</span>
                <span className="font-mono">{cert.certNumber}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
