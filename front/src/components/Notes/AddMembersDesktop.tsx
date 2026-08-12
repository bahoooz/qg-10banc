import { useState } from "react";
import { useUsers } from "../../hooks/useUsers";
import Loading from "../global/Loading";
import { Check } from "lucide-react";
import { useSession } from "../../hooks/useSession";

export default function AddMembersDesktop({
  isOpen,
  onClose,
  memberIds,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  memberIds: number[];
  onSave: (ids: number[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>(memberIds);
  const { data: users, isLoading, isError } = useUsers();
  const { data: session, isLoading: sessionLoading } = useSession();

  if (!isOpen) return null;
  if (isLoading || sessionLoading) return <Loading />;
  if (isError) return <p>Une erreur est survenue.</p>;

  const toggleMember = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((memberId) => memberId !== id)
        : [...prev, id],
    );
  };

  return (
    <div className="bg-background rounded-xl flex flex-col items-start justify-between h-full p-4 xl:px-8">
      <h2 className="text-lg">Sélectionner les membres</h2>
      <div className="flex flex-col gap-6 md:gap-8 overflow-auto scrollbar-thin">
        {users
          ?.filter((u) => u.id !== session?.id)
          ?.map((u) => {
            const isSelected = selectedIds.includes(u.id);

            return (
              <button
                key={u.id}
                className="flex gap-5 md:gap-6 lg:gap-5 xl:gap-6 items-center cursor-pointer hover:opacity-50 transition-all hover:scale-95"
                onClick={() => toggleMember(u.id)}
              >
                <div className="relative overflow-hidden">
                  <Check
                    size={40}
                    className={`${isSelected ? "flex absolute left-1/2 top-1/2 -translate-1/2 z-10 text-main-color" : "hidden"}`}
                  />
                  <div
                    className={`${isSelected ? "w-full h-full bg-black opacity-75 absolute rounded-full" : "hidden"}`}
                  ></div>
                  <img
                    className="object-cover aspect-square rounded-full md:w-28 lg:w-24 xl:w-28"
                    src={u.avatar}
                    alt={u.username}
                    width={84}
                    height={84}
                  />
                </div>
                <h3 className="text-xl md:text-2xl lg:text-xl xl:text-2xl">{u.username}</h3>
              </button>
            );
          })}
      </div>
      <div className="flex w-full justify-between">
        <button
          onClick={onClose}
          className="bg-background-secondary rounded-lg transition-all hover:scale-[102%] cursor-pointer h-10 px-6"
        >
          Fermer
        </button>
        <button
          onClick={() => {
            onSave(selectedIds);
            onClose();
          }}
          className="bg-secondary-color rounded-lg transition-all hover:scale-[102%] cursor-pointer h-10 px-6"
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}
