import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BadgeCheck } from "lucide-react";
import type { Metadata } from "next";
import { CertificateCard } from "@/components/certificate-card";

export const metadata: Metadata = {
  title: "Verify a Zeni Certification certificate",
};

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  // publicId is an opaque, non-sequential UUID — safe to expose in a public,
  // unauthenticated lookup. No internal ids, emails, or other user data are
  // read or rendered here.
  const certificate = await prisma.certificate.findUnique({
    where: { publicId },
    select: {
      certNumber: true,
      issuedAt: true,
      user: { select: { name: true } },
      course: { select: { title: true, category: true } },
    },
  });

  if (!certificate) notFound();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Image src="/brand/zeni-logo.svg" alt="Zeni" width={104} height={24} priority />
        <div className="flex items-center gap-1.5 rounded-full bg-success-light px-3 py-1 text-sm font-medium text-success">
          <BadgeCheck className="size-4" />
          Verified Corporate Certificate
        </div>
      </div>

      <div className="w-full max-w-xl">
        <CertificateCard
          recipientName={certificate.user.name}
          courseTitle={certificate.course.title}
          courseCategory={certificate.course.category}
          issuedAt={certificate.issuedAt}
          certNumber={certificate.certNumber}
        />
      </div>

      <p className="mt-6 max-w-sm text-center text-xs text-muted-foreground">
        This page confirms a certificate issued by Zeni Certification. Anyone with this link can verify
        its authenticity — no account required.
      </p>
    </div>
  );
}
