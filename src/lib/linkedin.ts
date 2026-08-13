// Zeni's LinkedIn Company Page organization id (linkedin.com/company/zeni).
export const LINKEDIN_ORG_ID = "40774199";

// TODO: replace with the certification app's real deployed domain (no
// trailing slash) once it has one.
export const OUR_DOMAIN = "https://certification.zeni.ai";

export type LinkedInCertificateInput = {
  courseName: string;
  certNumber: string;
  publicId: string;
  issuedAt: Date;
};

/**
 * Builds a LinkedIn "Add to Profile" deep link for a certification, following
 * LinkedIn's documented certification-add URL scheme (see LinkedIn Help:
 * "Add a license or certification to your profile" → share link format):
 *
 *   https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME
 *     &name=...&organizationId=...&issueYear=...&issueMonth=...
 *     &certUrl=...&certId=...
 *
 * Every value is passed through URLSearchParams — never string-concatenated —
 * so a course name, cert number, etc. can never break or inject into the
 * resulting query string.
 */
export function buildLinkedInAddCertificateUrl({
  courseName,
  certNumber,
  publicId,
  issuedAt,
}: LinkedInCertificateInput): string {
  // Date#getMonth() is 0-indexed (January = 0); LinkedIn's certification
  // form expects a 1-12 calendar month.
  const issueMonth = issuedAt.getMonth() + 1;
  const issueYear = issuedAt.getFullYear();

  const certUrl = `${OUR_DOMAIN}/certificates/verify/${publicId}`;

  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: courseName,
    organizationId: LINKEDIN_ORG_ID,
    issueYear: String(issueYear),
    issueMonth: String(issueMonth),
    certUrl,
    certId: certNumber,
  });

  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}
