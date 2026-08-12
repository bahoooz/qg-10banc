import { useSession } from "../../hooks/useSession";
import { useUsers } from "../../hooks/useUsers";
import Loading from "./Loading";

export default function Status({ className }: { className?: string }) {
  const { data: users, isLoading } = useUsers();
  const { data: session, isLoading: sessionLoading } = useSession();

  if (isLoading || sessionLoading) return <Loading />;

  return (
    <div
      className={`${className} bg-background-secondary absolute -bottom-1 left-0 translate-y-full p-4 rounded-3xl border-4 border-[#22242E]`}
    >
      <h3 className="uppercase text-[#595C6B] text-end mb-3">Statut</h3>
      <div className="flex flex-col gap-3">
        {users
          ?.filter((u) => u.id !== session?.id)
          ?.map((u) => {
            const now = new Date().getTime();
            const lastActive = new Date(u.lastActiveAt).getTime();
            const isOnline = now - lastActive < 2 * 60 * 1000;
            return (
              <div
                className="flex justify-between items-center gap-8"
                key={u.id}
              >
                <h4 className="text-lg">{u.username}</h4>
                <div
                  className={`rounded-full w-4 h-4 ${isOnline ? "bg-green-400" : "bg-red-400"}`}
                ></div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
