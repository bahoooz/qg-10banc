import { Link, useLocation, useNavigate } from "react-router-dom";
import Loading from "../components/global/Loading";
import { useGetNote } from "../hooks/useGetNote";
import { useSession } from "../hooks/useSession";
import { useUsers } from "../hooks/useUsers";
import { useEffect, useState, type FormEvent } from "react";
import data from "@emoji-mart/data";
import type { EditNote, EmojiMartData, NoteEditorFormProps } from "../../types";
import { TipTapEditor } from "../components/Notes/TipTapEditor";
import Picker from "@emoji-mart/react";
import { previewJSONText } from "../lib/utils";
import { TipTapEditorDesktop } from "../components/Notes/TipTapEditorDesktop";
import AddMembers from "../components/Notes/AddMembers";
import AddMembersDesktop from "../components/Notes/AddMembersDesktop";
import Footer from "../components/global/Footer";
import { useUpdateNote } from "../hooks/useUpdateNote";
import { toast } from "sonner";
import { getErrorMessage } from "../lib/errorMessages";

const NoteEditorForm = ({ note }: NoteEditorFormProps) => {
  const navigate = useNavigate();
  const { data: session, isLoading } = useSession();
  const { mutate: updateNote } = useUpdateNote();
  const { data: users } = useUsers();
  const [isOpenEditor, setIsOpenEditor] = useState(false);
  const [isOpenAddMembers, setIsOpenAddMembers] = useState(false);
  const [isOpenAddMembersDesktop, setIsOpenAddMembersDesktop] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [formData, setFormData] = useState<EditNote>({
    id: note.id || 0,
    title: note.title || "",
    emoji: note.emoji || "",
    memberIds: note.members ? note.members.map((m) => m.id) : [],
    mentionMembers: note.mentionMembers || false,
    pin: note.pin || false,
    content: note.content || "",
  });
  console.log(formData);

  useEffect(() => {
    console.log(formData, session?.id);
  }, [formData, session]);

  if (isLoading) return <Loading />;

  const handleOpenEditor = () => setIsOpenEditor(true);
  const handleCloseEditor = () => setIsOpenEditor(false);
  const handleOpenAddMembers = () => setIsOpenAddMembers(!isOpenAddMembers);
  const handleCloseAddMembers = () => setIsOpenAddMembers(!isOpenAddMembers);
  const handleOpenAddMembersDesktop = () =>
    setIsOpenAddMembersDesktop(!isOpenAddMembersDesktop);
  const handleCloseAddMembersDesktop = () =>
    setIsOpenAddMembersDesktop(!isOpenAddMembersDesktop);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSelectEmoji = (emoji: EmojiMartData) => {
    setFormData((prev) => ({ ...prev, emoji: emoji.native }));
    setShowEmojiPicker(false);
  };

  const handleSaveAddMembers = (memberIds: number[]) => {
    setFormData((prev) => ({
      ...prev,
      memberIds,
    }));
  };

  const handleSaveAddMembersDesktop = (memberIds: number[]) => {
    setFormData((prev) => ({
      ...prev,
      memberIds,
    }));
  };

  const handleSaveEditor = (jsonContent: object) => {
    setFormData((prev) => ({
      ...prev,
      content: jsonContent,
    }));
    setIsOpenEditor(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    updateNote(
      { ...formData },
      {
        onSuccess: () => {
          toast.success("La note a été modifiée avec succès");
          navigate("/notes");
        },
        onError: (error) => {
          if (error.errorCode === "VALIDATION_ERROR" && error.details) {
            const errorLists = Object.values(error.details);

            if (errorLists.length > 0 && errorLists[0].length > 0) {
              const firstErrorMessage = errorLists[0][0];
              toast.error(firstErrorMessage);
              return;
            }
          }

          const errorMessage = getErrorMessage(error.errorCode);
          toast.error(errorMessage);
        },
      },
    );
  };

  const selectedUsers = users?.filter((u) => formData.memberIds.includes(u.id));
  console.log(selectedUsers);
  return (
    <>
    <title>Modification de la note - QG10banc</title>
      <div className="h-dvh flex flex-col justify-between">
        <TipTapEditor
          isOpen={isOpenEditor}
          onClose={handleCloseEditor}
          initialContent={formData.content}
          onSave={handleSaveEditor}
        />
        <div className="bg-background-secondary h-[68%] md:h-[72%] lg:h-[78%] mt-32 lg:mt-40 rounded-3xl p-4 lg:p-8 lg:flex lg:items-center lg:justify-center relative lg:gap-6 xl:gap-8">
          <div className="bg-background h-full rounded-xl overflow-hidden">
            {!isOpenAddMembers ? (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-4 md:gap-5 h-full p-2 md:p-4 md:max-w-[700px] lg:max-w-[800px] xl:max-w-[900px]"
              >
                <div className="flex flex-col gap-2">
                  <h2>Titre de la note</h2>
                  <div className="relative">
                    <input
                      name="title"
                      onChange={handleChange}
                      value={formData.title}
                      className="bg-background-secondary rounded-lg h-10 w-full px-2 placeholder:opacity-40"
                      placeholder="Objectif vidéo samedi 29/11..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-xl cursor-pointer hover:scale-125 hover:rotate-45 active:scale-105 transition-all duration-300"
                    >
                      {formData.emoji}
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute translate-y-2 right-0 max-w-full rounded-xl overflow-x-scroll overflow-y-hidden h-80 sm:h-fit scrollbar-thin">
                        <Picker
                          locale="fr"
                          data={data}
                          onEmojiSelect={handleSelectEmoji}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-4 md:flex-row md:justify-between">
                  <div className="flex justify-between md:flex-col md:gap-2">
                    <h2>Ajouter des membres</h2>
                    <div className="flex gap-2">
                      <div className="flex -space-x-4">
                        {selectedUsers?.map((u) => (
                          <img
                            className="size-8 rounded-full"
                            key={u.id}
                            src={u.avatar}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenAddMembers}
                        className="size-8 border-[3px] rounded-full flex justify-center items-center cursor-pointer hover:scale-[102%] active:scale-[102%] transition-all lg:hidden"
                      >
                        <p className="text-xl">+</p>
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenAddMembersDesktop}
                        className="size-8 border-[3px] rounded-full hidden justify-center items-center cursor-pointer hover:scale-[102%] active:scale-[102%] transition-all lg:flex"
                      >
                        <p className="text-xl">+</p>
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between md:flex-col md:gap-2">
                    <h2>Mentionner les membres ajoutés</h2>
                    <input
                      onChange={handleChange}
                      className="size-8 appearance-none border-[3px] rounded-full checked:bg-secondary-color cursor-pointer transition-all hover:scale-[102%]"
                      type="checkbox"
                      name="mentionMembers"
                      checked={formData.mentionMembers}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-4 sm:gap-5 h-full md:hidden">
                  <button
                    type="button"
                    onClick={handleOpenEditor}
                    className="bg-secondary-color rounded-lg transition-all hover:scale-[101%] cursor-pointer h-10 px-6"
                  >
                    Écrire la note
                  </button>
                  <div className="bg-background-secondary h-32 rounded-lg p-2 overflow-y-scroll scrollbar-thin">
                    <p className="wrap-break-word">
                      {"Preview de la note : " +
                        (previewJSONText(formData.content) || "aucun contenu")}
                    </p>
                  </div>
                </div>
                <div className="hidden md:flex flex-col flex-1 min-h-0 gap-4">
                  <h2>Contenu de la note</h2>
                  <div className="flex-1 min-h-0">
                    <TipTapEditorDesktop
                      initialContent={formData.content}
                      onSave={(content) =>
                        setFormData((prev) => ({ ...prev, content }))
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <Link
                    className="bg-background-secondary rounded-lg transition-all hover:scale-[102%] cursor-pointer h-10 px-6 flex items-center justify-center"
                    to={"/notes"}
                  >
                    Fermer
                  </Link>
                  <button
                    type="submit"
                    className="bg-secondary-color rounded-lg transition-all hover:scale-[102%] cursor-pointer h-10 px-6"
                  >
                    Modifier la note
                  </button>
                </div>
              </form>
            ) : (
              <AddMembers
                isOpen={isOpenAddMembers}
                onClose={handleCloseAddMembers}
                memberIds={formData.memberIds}
                onSave={handleSaveAddMembers}
              />
            )}
          </div>
          <AddMembersDesktop
            isOpen={isOpenAddMembersDesktop}
            onClose={handleCloseAddMembersDesktop}
            memberIds={formData.memberIds}
            onSave={handleSaveAddMembersDesktop}
          />
        </div>
        <Footer className="flex items-center justify-between gap-3 flex-1" />
      </div>
    </>
  );
};

export default function NoteEditingPage() {
  const path = useLocation();
  const slug = path.pathname;
  const { data: note, isLoading } = useGetNote(slug.slice(12));

  if (isLoading || !note) return <Loading />;

  return <NoteEditorForm note={note} />;
}
