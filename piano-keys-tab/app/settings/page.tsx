import { requireUser } from "@/lib/session";
import { getOrCreateSettings } from "@/lib/services";
import { SettingsForm } from "@/components/features/settings-form";
import type { SettingsInput } from "@/lib/validation";

export const metadata = {
  title: "Settings",
  description: "Practice preferences, appearance, password and account settings.",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getOrCreateSettings(user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          These preferences are stored on your account and restored the next time you practise.
        </p>
      </div>

      <SettingsForm initial={settings as unknown as SettingsInput} />
    </div>
  );
}
