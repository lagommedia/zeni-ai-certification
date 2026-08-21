import "server-only";
import { WebClient } from "@slack/web-api";
import { renderCertificateCelebrationGif } from "@/lib/certificate-gif";

export type CertificateCelebrationInput = {
  recipientName: string;
  recipientEmail: string;
  courseTitle: string;
  courseCategory: string;
  certNumber: string;
  issuedAt: Date;
};

/** Resolves a Zeni email to a real Slack mention (`<@U0123...>`), which
 *  notifies the person and renders as a clickable tag — falling back to
 *  their plain name if they don't have a Slack account with that email,
 *  or the users:read.email scope isn't granted. */
async function resolveMention(client: WebClient, email: string, fallbackName: string) {
  try {
    const result = await client.users.lookupByEmail({ email });
    if (result.user?.id) return `<@${result.user.id}>`;
  } catch (err) {
    console.warn(`Slack: couldn't resolve ${email} to a mention, using plain name instead.`, err);
  }
  return `*${fallbackName}*`;
}

function buildMessage(mention: string, courseTitle: string) {
  return `:tada: Congrats to ${mention} on completing *${courseTitle}*! :mortar_board:`;
}

/**
 * Posts a celebratory message + the earned certificate image to the
 * configured Slack channel. Never throws — a Slack outage or missing
 * config shouldn't block a student from getting their certificate, so
 * failures are logged and swallowed here rather than at every call site.
 */
export async function postCertificateCelebration(input: CertificateCelebrationInput) {
  const token = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CELEBRATION_CHANNEL_ID;

  if (!token || !channelId) {
    console.warn(
      "Skipping Slack celebration post — SLACK_BOT_TOKEN and/or SLACK_CELEBRATION_CHANNEL_ID is not set."
    );
    return;
  }

  try {
    const client = new WebClient(token);
    const [gif, mention] = await Promise.all([
      renderCertificateCelebrationGif(input),
      resolveMention(client, input.recipientEmail, input.recipientName),
    ]);

    await client.files.uploadV2({
      channel_id: channelId,
      initial_comment: buildMessage(mention, input.courseTitle),
      file: gif,
      filename: `${input.certNumber}-certificate.gif`,
    });
  } catch (err) {
    console.error("Slack celebration post failed:", err);
  }
}
