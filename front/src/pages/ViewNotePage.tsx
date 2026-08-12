import { useLocation } from "react-router-dom";
import { useGetNote } from "../hooks/useGetNote";
import { formatSlug } from "../lib/utils";
import Loading from "../components/global/Loading";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { TextAlign } from "@tiptap/extension-text-align";
import ImageExtension from "@tiptap/extension-image";
import { useEffect } from "react";
import Footer from "../components/global/Footer";

export default function ViewNotePage() {
  const location = useLocation();
  const path = location.pathname;
  const { data: note, isLoading } = useGetNote(formatSlug(path));

  const editor = useEditor({
    editable: false,
    content: note?.content,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      ImageExtension,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: "...",
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-invert wrap-break-word whitespace-pre-wrap prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none h-full [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-4 [&_h2]:mt-6 [&_h3]:text-xl [&_h3]:font-bold [&_p]:my-2 [&_a]:text-blue-400 [&_a]:underline cursor-text [&_img]:max-w-full [&_img]:rounded-lg",
      },
    },
  });

  useEffect(() => {
  if (editor && note?.content) {
    editor.commands.setContent(note.content);
  }
}, [editor, note?.content]);

  useEffect(() => {
    if (note?.title) {
      document.title = `${note.title} - QG10banc`;
    } else if (isLoading) {
      document.title = "Chargement... - QG10banc";
    }

    // Optionnel : remettre le titre par défaut quand on quitte la page
    return () => {
      document.title = "QG10banc";
    };
  }, [note?.title, isLoading]);

  if (isLoading) return <Loading />;

  return (
    <div className="h-dvh flex flex-col justify-between">
      <div className="bg-background-secondary h-[68%] md:h-[72%] lg:h-[78%] mt-32 lg:mt-40 rounded-3xl p-4 lg:p-8 lg:flex lg:items-center lg:justify-center relative lg:gap-6 xl:gap-8">
        <div className="bg-background h-full rounded-xl overflow-hidden relative">
          <div className="p-4 h-full md:w-[700px] lg:w-[800px] xl:w-[900px] overflow-y-scroll scrollbar-thin overflow-x-hidden">
            <EditorContent className="" editor={editor} />
            <div className="absolute flex right-2 bottom-3.5 -space-x-3">
              <img
                src={note?.author.avatar}
                width={48}
                height={48}
                className="rounded-full object-cover aspect-square"
                alt="author"
              />
              {note?.members.map((member) => (
                <img
                  key={member.id}
                  src={member.avatar}
                  width={48}
                  height={48}
                  className="rounded-full object-cover aspect-square"
                  alt={`Member : ${member.id}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer className="flex-1" />
    </div>
  );
}
