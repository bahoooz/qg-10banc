import { Link } from "react-router-dom";
import type { Notes } from "../../../types";
import { formatDate } from "../../lib/utils";
import { ExternalLink, Pin, PinOff } from "lucide-react";
import { usePinNote } from "../../hooks/usePinNote";

export default function PinnedNoteCard({
  id,
  title,
  slug,
  updatedAt,
  emoji,
  className,
  childClassName
}: Notes) {
  const { mutate: pinNote } = usePinNote();
  return (
    <div
      className={`${className} flex gap-3 items-center transition-all hover:scale-99`}
    >
      <div
        className={`${childClassName} flex flex-col gap-2 xl:gap-3 bg-background rounded-xl py-4 px-6`}
      >
        <h3 className="text-xl">
          {title} {emoji}
        </h3>
        <div className="flex text-xs xl:text-sm gap-3 justify-between text-main-color">
          <h4>{formatDate(updatedAt)}</h4>
          <Link
            to={`/notes/edit/${slug}`}
            className="hover:scale-105 transition-all"
          >
            Modifier
          </Link>
          <Link
            to={`/notes/view/${slug}`}
            className="hover:scale-105 transition-all"
          >
            <ExternalLink className="xl:hidden -mt-0.5" size={20} />
            <span className="hidden xl:block">Ouvrir</span>
          </Link>
        </div>
      </div>
      <button
        className="group cursor-pointer rounded-md p-0.5 transition-all hover:bg-white/10 hover:scale-110"
        onClick={() => pinNote(id)}
      >
        <Pin className="rotate-30 min-w-6 min-h-6 xl:min-w-7 xl:min-h-7 transition-all hover:scale-105 group-hover:hidden" />
        <PinOff className="hidden group-hover:block rotate-30 min-w-6 min-h-6 sm:min-w-7 sm:min-h-7 transition-all scale-105" />
      </button>
    </div>
  );
}
