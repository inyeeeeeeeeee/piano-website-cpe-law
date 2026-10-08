import "server-only";
import { createNotification } from "@/lib/services";

/** Notification helpers kept apart to avoid circular imports. */

export async function notificationForNewSubmission(
  userId: string,
  songTitle: string
): Promise<void> {
  await createNotification(userId, {
    type: "SUBMISSION",
    title: `Submission received: "${songTitle}"`,
    body: "An editor will review it shortly. You will be notified about the decision.",
    link: "/dashboard",
  });
}
