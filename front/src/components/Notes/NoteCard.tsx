import { Bell, Clock8, ExternalLink, Pencil, Pin, Trash2 } from "lucide-react";
import type { Notes } from "../../../types";
import { formatDate, previewJSONText } from "../../lib/utils";
import { Link } from "react-router-dom";
import { usePinNote } from "../../hooks/usePinNote";
import { useDeleteNote } from "../../hooks/useDeleteNote";
import { toast } from "sonner";
import { getErrorMessage } from "../../lib/errorMessages";

export default function NoteCard({
  id,
  title,
  slug,
  emoji,
  mentionMembers,
  content,
  updatedAt,
  author,
  members,
}: Notes) {
  const { mutate: pinNote } = usePinNote();
  const { mutate: deleteNote } = useDeleteNote();

  return (
    <div className="bg-background rounded-xl p-2 sm:p-3 lg:p-4 flex flex-col gap-3 sm:gap-4 transition-all hover:scale-99 wrap-break-word whitespace-pre-wrap group">
      <div className="flex justify-between">
        <h3 className="text-lg lg:text-xl">
          {title} {emoji}
        </h3>
        <div className="flex gap-2 items-center">
          {mentionMembers && (
            <Bell className="min-w-6 min-h-6 sm:min-w-7 sm:min-h-7" />
          )}{" "}
          <div className="flex gap-1">
            <img
              src={author.avatar}
              width={24}
              height={24}
              className="rounded-full object-cover sm:w-8 lg:w-9 aspect-square"
            />
            {members.map((member) => (
              <img
                key={member.id}
                src={member.avatar}
                width={24}
                height={24}
                className="rounded-full object-cover sm:w-8 lg:w-9 aspect-square"
              />
            ))}
          </div>
        </div>
      </div>
      <p className="text-base line-clamp-3 sm:line-clamp-5 leading-relaxed">
        {previewJSONText(content)}
      </p>
      <div className="flex text-sm items-center justify-between relative">
        <div className="flex items-center gap-5 sm:gap-8 text-main-color">
          <h4 className="flex items-center gap-2">
            {formatDate(updatedAt)}
            <Clock8 className="hidden sm:block" size={20} />
          </h4>
          <Link
            to={`/notes/edit/${slug}`}
            className="hover:scale-105 transition-all flex items-center gap-2"
          >
            Modifier
            <Pencil className="hidden sm:block" size={20} />
          </Link>
          <Link
            to={`/notes/view/${slug}`}
            className="hover:scale-105 transition-all flex items-center gap-2"
          >
            Ouvrir
            <ExternalLink className="hidden sm:block" size={20} />
          </Link>
        </div>
        <button
          className="absolute right-12 bottom-0.5 hidden cursor-pointer rounded-md p-0.5 transition-all hover:bg-red-500/15 hover:scale-110 sm:group-hover:block"
          onClick={() =>
            deleteNote(id, {
              onSuccess: () => {
                toast.success("La note a été supprimée avec succès");
              },
              onError: (error) => {
                const errorMessage = getErrorMessage(error.message);
                toast.error(errorMessage);
              },
            })
          }
        >
          <Trash2 className="min-w-6 min-h-6 text-white/70 transition-all hover:text-red-500 sm:min-w-7 sm:min-h-7" />
        </button>
        <button
          className="cursor-pointer rounded-md p-0.5 transition-all hover:bg-white/10 hover:scale-110"
          onClick={() => pinNote(id)}
        >
          <Pin className="rotate-30 min-w-6 min-h-6 sm:min-w-7 sm:min-h-7 transition-all" />
        </button>
      </div>
    </div>
  );
}
