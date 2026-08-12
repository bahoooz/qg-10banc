import { Instagram, Plus, X, Youtube } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  getSocialLoginUrl,
  type SocialAccount,
  type SocialPlatform,
} from "../../hooks/useSocialAccounts";

type SocialAccountConnectModalProps = {
  open: boolean;
  onClose: () => void;
  accounts: SocialAccount[];
};

type PlatformConfig = {
  id: SocialPlatform;
  label: string;
  description: string;
  icon: ReactNode;
  accentClass: string;
  available: boolean;
};

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z" />
    </svg>
  );
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "instagram",
    label: "Instagram",
    description: "Reels & stories",
    icon: <Instagram className="size-5" />,
    accentClass: "border-pink-400/40 bg-pink-400/10 text-pink-100",
    available: false,
  },
  {
    id: "tiktok",
    label: "TikTok",
    description: "Publication & brouillons",
    icon: <TikTokIcon className="size-5" />,
    accentClass: "border-white/20 bg-white/5 text-white",
    available: true,
  },
  {
    id: "youtube",
    label: "YouTube",
    description: "Shorts & chaîne",
    icon: <Youtube className="size-5" />,
    accentClass: "border-red-400/40 bg-red-400/10 text-red-100",
    available: true,
  },
];

function PlatformAccounts({
  platform,
  accounts,
}: {
  platform: SocialPlatform;
  accounts: SocialAccount[];
}) {
  const platformAccounts = accounts.filter((account) => account.platform === platform);

  if (platformAccounts.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {platformAccounts.map((account) => (
        <div
          key={`${platform}-${account.id}`}
          className="flex items-center gap-2 rounded-lg border border-secondary-color/40 bg-background px-2.5 py-2"
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
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white/85">{account.label}</p>
            {account.handle && (
              <p className="truncate text-[10px] text-white/35">{account.handle}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SocialAccountConnectModal({
  open,
  onClose,
  accounts,
}: SocialAccountConnectModalProps) {
  if (!open) return null;

  const handleConnect = (platform: PlatformConfig) => {
    if (!platform.available) {
      toast.info("Connexion Instagram bientôt disponible");
      return;
    }

    if (platform.id === "instagram") return;

    window.open(getSocialLoginUrl(platform.id), "_blank", "noopener,noreferrer");
    toast.message(`Connecte ton compte ${platform.label} dans l'onglet ouvert`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-secondary-color/60 bg-background-secondary p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="social-account-modal-title"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2
              id="social-account-modal-title"
              className="text-sm font-extrabold uppercase tracking-wide text-main-color"
            >
              Ajouter un compte
            </h2>
            <p className="mt-1 text-xs text-white/40">
              Connecte tes comptes pour publier ou programmer plus tard.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-secondary-color/60 text-white/50 transition-colors hover:text-white"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          {PLATFORMS.map((platform) => (
              <div
                key={platform.id}
                className={`rounded-xl border p-4 ${platform.accentClass}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-black/20">
                      {platform.icon}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold uppercase tracking-wide">
                        {platform.label}
                      </p>
                      <p className="text-[11px] opacity-70">{platform.description}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleConnect(platform)}
                    className="inline-flex size-10 items-center justify-center rounded-xl border border-current/30 bg-black/20 transition-all hover:scale-105 active:scale-95"
                    aria-label={`Ajouter un compte ${platform.label}`}
                  >
                    <Plus className="size-5" />
                  </button>
                </div>

                <PlatformAccounts platform={platform.id} accounts={accounts} />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
