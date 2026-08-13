import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "./print-button";
import { AddToLinkedInButton } from "@/components/add-to-linkedin-button";
import { CertificateCard } from "@/components/certificate-card";

export default async function CertificateDetailPage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: { course: true, user: true },
  });

  if (!certificate || certificate.userId !== user.id) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/certificates"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to certificates
        </Link>
        <div className="flex items-center gap-2">
          <AddToLinkedInButton
            courseName={certificate.course.title}
            certNumber={certificate.certNumber}
            publicId={certificate.publicId}
            issuedAt={certificate.issuedAt}
          />
          <PrintButton />
        </div>
      </div>

      <CertificateCard
        recipientName={certificate.user.name}
        courseTitle={certificate.course.title}
        courseCategory={certificate.course.category}
        issuedAt={certificate.issuedAt}
        certNumber={certificate.certNumber}
      />
    </div>
  );
}
