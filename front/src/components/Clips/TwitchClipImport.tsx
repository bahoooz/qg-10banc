import { type FormEvent, useState } from "react";
import { Link2, Plus } from "lucide-react";
import { twitchClipUrlSchema } from "../../schemas/clipEditor";
import {
  getTwitchLoginUrl,
  useTwitchAccounts,
  type TwitchAccountSummary,
} from "../../hooks/useTwitchAccounts";

type TwitchClipImportProps = {
  onSubmit: (payload: {
    url: string;
    twitchAccountId?: string;
  }) => void | Promise<void>;
  disabled?: boolean;
};

function AccountChip({
  account,
  selected,
  onSelect,
}: {
  account: TwitchAccountSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
        selected
          ? "border-main-color/60 bg-main-color/10"
          : "border-secondary-color/50 bg-background hover:border-main-color/30"
      }`}
    >
      {account.avatar ? (
        <img
          src={account.avatar}
          alt=""
          className="size-7 rounded-full object-cover"
        />
      ) : (
        <div className="size-7 rounded-full bg-secondary-color/40" />
      )}
      <span className="text-sm font-bold text-white/80">
        {account.displayName ?? account.login}
      </span>
    </button>
  );
}

export default function TwitchClipImport({
  onSubmit,
  disabled = false,
}: TwitchClipImportProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();

  const { data: accounts = [], isLoading: accountsLoading } = useTwitchAccounts();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = twitchClipUrlSchema.safeParse(url);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Lien invalide");
      return;
    }

    if (accounts.length === 0) {
      setError("Connecte d'abord un compte Twitch autorisé sur ce clip");
      return;
    }

    setError(null);
    await onSubmit({
      url: result.data,
      twitchAccountId: selectedAccountId ?? accounts[0]?.id,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-secondary-color/40">
          <Link2 className="size-5 text-main-color" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold uppercase tracking-wide">
            Clip Twitch
          </h2>
          <p className="text-sm text-white/50">
            API Helix officielle — qualité native du clip
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-white/45">
            Comptes Twitch
          </p>
          <a
            href={getTwitchLoginUrl()}
            className="inline-flex items-center gap-1 rounded-lg border border-secondary-color/60 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-main-color transition-colors hover:border-main-color/50"
          >
            <Plus className="size-3.5" />
            Connecter
          </a>
        </div>

        {accountsLoading ? (
          <p className="text-sm text-white/40">Chargement des comptes…</p>
        ) : accounts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {accounts.map((account) => (
              <AccountChip
                key={account.id}
                account={account}
                selected={
                  (selectedAccountId ?? accounts[0]?.id) === account.id
                }
                onSelect={() => setSelectedAccountId(account.id)}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-secondary-color/50 px-3 py-2 text-sm text-white/40">
            Connecte le compte broadcaster ou éditeur de la chaîne pour
            télécharger le clip en pleine qualité.
          </p>
        )}
      </div>

      <input
        type="url"
        value={url}
        onChange={(event) => {
          setUrl(event.target.value);
          if (error) setError(null);
        }}
        placeholder="https://clips.twitch.tv/..."
        disabled={disabled}
        className="w-full rounded-xl border border-secondary-color/60 bg-background px-4 py-3.5 text-sm outline-none transition-colors placeholder:text-white/30 focus:border-main-color/60 disabled:opacity-50"
      />

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled || url.trim().length === 0 || accounts.length === 0}
        className="mt-auto w-full rounded-xl bg-main-color px-4 py-3.5 text-sm font-extrabold uppercase tracking-wide text-background transition-all hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Importer le clip
      </button>
    </form>
  );
}
