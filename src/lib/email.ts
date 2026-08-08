import "server-only";

import { Resend } from "resend";

import { getServerEnv } from "@/lib/env.server";
import type { MutationResult } from "@/lib/types/common";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Thin Resend wrapper. Returns a `MutationResult` instead of throwing so an
 * unconfigured environment degrades into a clear message the UI can show —
 * emailing a notification is a nice-to-have, and a missing API key should
 * never take down the notifications job or the center view.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<MutationResult> {
  const { RESEND_API_KEY, EMAIL_FROM } = getServerEnv();

  if (!RESEND_API_KEY || !EMAIL_FROM) {
    return {
      success: false,
      error: "Email delivery is not configured.",
    };
  }

  try {
    const { error } = await new Resend(RESEND_API_KEY).emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (cause) {
    return {
      success: false,
      error: cause instanceof Error ? cause.message : "Failed to send the email.",
    };
  }
}
