import {
  useEditor,
  EditorContent,
  Editor,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { TextAlign } from "@tiptap/extension-text-align";
import ImageExtension from "@tiptap/extension-image";
import {
  Palette,
  Italic,
  Paperclip,
  List,
  TextAlignStart,
  TextAlignJustify,
  TextAlignEnd,
  TextAlignCenter,
  Heading1,
  Heading2,
  ListOrdered,
  Image as ImageIcon,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  const [, setForceUpdate] = useState(0);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => setForceUpdate((prev) => prev + 1);
    editor.on("transaction", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);
    return () => {
      editor.off("transaction", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor]);

  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `px-2 py-1 rounded flex items-center justify-center transition-colors ${
      active
        ? "bg-secondary-color text-white"
        : "bg-background text-white hover:bg-gray-700"
    }`;

  return (
    <div className="bg-background-secondary rounded-xl p-3 flex gap-3 *:cursor-pointer overflow-auto scrollbar-thin">
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        className={btnClass(editor.isActive({ textAlign: "left" }))}
        title="Aligner à gauche"
      >
        <TextAlignStart size={22} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        className={btnClass(editor.isActive({ textAlign: "center" }))}
        title="Centrer"
      >
        <TextAlignCenter size={22} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        className={btnClass(editor.isActive({ textAlign: "right" }))}
        title="Aligner à droite"
      >
        <TextAlignEnd size={22} />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        className={btnClass(editor.isActive({ textAlign: "justify" }))}
        title="Justifier"
      >
        <TextAlignJustify size={22} />
      </button>
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          className={btnClass(!!editor.getAttributes("textStyle").color)}
          title="Changer la couleur"
        >
          <Palette
            size={20}
            className="cursor-pointer"
            style={{ color: editor.getAttributes("textStyle").color || "white" }}
          />
        </button>
        
        <input
          type="color"
          ref={colorInputRef}
          className="absolute left-1/2 bottom-0 w-px h-px opacity-0 pointer-events-none -z-10"
          onInput={(event) => {
            editor.chain().focus().setColor(event.currentTarget.value).run();
          }}
          value={editor.getAttributes("textStyle").color || "#000000"}
        />
      </div>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btnClass(editor.isActive("italic"))}
      >
        <Italic size={22} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btnClass(editor.isActive("heading", { level: 2 }))}
      >
        <Heading1 size={22} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btnClass(editor.isActive("heading", { level: 3 }))}
      >
        <Heading2 size={22} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btnClass(editor.isActive("bulletList"))}
      >
        <List size={22} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btnClass(editor.isActive("orderedList"))}
      >
        <ListOrdered size={22} />
      </button>
      <button
        type="button"
        onClick={() => {
          const previousUrl = editor.getAttributes("link").href;
          const url = window.prompt("URL du lien", previousUrl);
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url })
            .run();
        }}
        className={btnClass(editor.isActive("link"))}
      >
        <Paperclip size={22} />
      </button>
      <button
        type="button"
        onClick={() => {
          const url = window.prompt("URL de l'image");
          if (url) {
            editor.chain().focus().setImage({ src: url }).run();
          }
        }}
        className={btnClass(editor.isActive("image"))}
      >
        <ImageIcon size={22} />
      </button>
    </div>
  );
};

export const TipTapEditorDesktop = ({
  initialContent,
  onSave,
}: {
  initialContent: JSONContent;
  onSave: (content: JSONContent) => void;
}) => {
  const editor = useEditor({
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
        emptyEditorClass: "is-editor-empty",
        placeholder: "...",
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onSave(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none h-full overflow-y-auto p-4 scrollbar-thin [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-4 [&_h2]:mt-6 [&_h3]:text-xl [&_h3]:font-bold [&_p]:my-2 [&_a]:text-blue-400 [&_a]:underline cursor-text [&_img]:max-w-full [&_img]:rounded-lg",
      },
    },
  });

  return (
    <div className="h-full flex flex-col gap-4">
      <MenuBar editor={editor} />
      <div className="bg-background-secondary rounded-xl flex-1 min-h-0 overflow-hidden border border-white/5">
        <EditorContent editor={editor} className="h-full" />
      </div>
      <div className="bg-background h-full w-full left-0 top-0 absolute -z-10"></div>
    </div>
  );
};
