import type { FollowStickerConfig } from "../../lib/followSticker";
import { FollowStickerPlatformIcon } from "../../lib/followStickerPlatformIcons";

type FollowStickerBadgeProps = {
  config: FollowStickerConfig;
};

/**
 * Composant visuel du sticker follow — c'est ici que tu stylises le rendu preview.
 * Tailles fixes en px ; la largeur du pill suit le pseudo (px-4 de chaque côté).
 */
export default function FollowStickerBadge({
  config,
}: FollowStickerBadgeProps) {
  const username = config.username.trim() || "Pseudo";

  return (
    <div
      data-follow-sticker-root
      className="inline-flex flex-col items-center text-white relative mt-2.5"
    >
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 bg-black px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.14em] whitespace-nowrap rounded-2xl">
        Viens follow
      </div>

      <div className="border-b-4 border-violet-500 relative inline-flex w-fit items-center gap-3 rounded-full bg-black px-3 py-1.5">
        <FollowStickerPlatformIcon
          platform={config.platform}
          className="size-4"
        />
        <span className="relative z-[1] whitespace-nowrap text-[20px] font-regular leading-none tracking-tight normal-case">
          {username}
        </span>
      </div>
    </div>
  );
}
