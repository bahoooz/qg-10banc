import { Pin, PinOff } from "lucide-react";
import Footer from "../components/global/Footer";
import { useNotes, usePinnedNotes } from "../hooks/useNotes";
import NoteCard from "../components/Notes/NoteCard";
import Loading from "../components/global/Loading";
import PinnedNoteCard from "../components/Notes/PinnedNoteCard";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function NotesPage() {
  const { data: notes, isLoading } = useNotes();
  const { data: pinnedNotes } = usePinnedNotes();
  const [showPinnedNotes, setShowPinnedNotes] = useState<boolean>();

  if (isLoading || !notes) return <Loading />;

  return (
    <>
      <title>Notes - QG10banc</title>
      <div className="h-dvh flex flex-col justify-between">
        <div className="bg-background-secondary h-[68%] md:h-[72%] lg:h-[78%] mt-32 lg:mt-40 rounded-3xl p-4 lg:p-8 lg:flex lg:items-center lg:justify-between relative">
          <div className="hidden lg:flex flex-col gap-4 2xl:absolute max-h-[90%] w-fit max-w-[550px] pr-8 overflow-auto scrollbar-thin">
            {pinnedNotes?.map((pinnedNote) => (
              <PinnedNoteCard key={pinnedNote.id} {...pinnedNote} />
            ))}
          </div>
          {notes?.length > 0 && (
            <Link
              to={"/notes/create"}
              className="hidden lg:flex justify-center items-center bg-background rounded-2xl h-20 2xl:h-24 w-20 2xl:w-24 text-5xl 2xl:text-6xl transition-all hover:scale-[102%] cursor-pointer absolute bottom-8 2xl:right-8"
            >
              +
            </Link>
          )}
          <div className="flex flex-col gap-4 lg:w-[600px] 2xl:w-[700px] min-h-full max-h-full overflow-y-scroll overflow-x-hidden mx-auto scrollbar-thin rounded-2xl relative">
            {showPinnedNotes
              ? pinnedNotes?.map((note) => (
                  <PinnedNoteCard
                    childClassName="w-full"
                    key={note.id}
                    {...note}
                  />
                ))
              : notes?.map((note) => <NoteCard key={note.id} {...note} />)}
            {notes?.length === 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-1/2 h-full flex flex-col justify-center items-center gap-6">
                <h2 className="text-2xl text-center">Aucune note disponible</h2>
                <Link
                  className="w-fit px-6 py-4 bg-secondary-color rounded-xl cursor-pointer transition-all hover:scale-[102%] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  to={"/notes/create"}
                >
                  Créer une note
                </Link>
              </div>
            )}
          </div>
        </div>

        <Footer
          className="flex flex-row gap-3"
          children={
            <div className="flex gap-3">
              {notes?.length > 0 && (
                <Link
                  to={"/notes/create"}
                  className="bg-background-secondary rounded-2xl h-14 w-14 text-4xl transition-all hover:scale-[102%] cursor-pointer flex justify-center items-center"
                >
                  +
                </Link>
              )}
              <button
                onClick={() => setShowPinnedNotes(!showPinnedNotes)}
                className="bg-background-secondary flex justify-center items-center rounded-2xl h-14 w-14 text-4xl transition-all hover:scale-[102%] cursor-pointer"
              >
                {showPinnedNotes ? (
                  <PinOff className="rotate-15" />
                ) : (
                  <Pin className="rotate-15" />
                )}
              </button>
            </div>
          }
        />
      </div>
    </>
  );
}
