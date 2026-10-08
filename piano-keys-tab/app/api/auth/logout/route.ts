import { withApi } from "@/lib/api";
import { signOut } from "@/lib/auth";

/** POST /api/auth/logout — clears the HTTP-only session cookie. */
export const POST = withApi(async () => {
  await signOut({ redirect: false });
  return { ok: true };
});
