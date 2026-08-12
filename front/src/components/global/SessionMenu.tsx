import { List, Users } from "lucide-react";
import { useSession } from "../../hooks/useSession";
import Loading from "./Loading";
import Status from "./Status";

export default function SessionMenu() {
  const { data: user, isLoading } = useSession();

  if (isLoading) return <Loading />;

  if (!user) return null;

  return (
    <div className="bg-background-secondary fixed right-4 xl:right-8 -translate-y-1/2 top-16 z-20 flex items-center pl-8 rounded-full gap-6 ">
      <div className="flex gap-8">
        <div>
          <List size={28} className="cursor-pointer hover:scale-105" />
        </div>
        <div className="group transition-all">
          <Users size={28} className="cursor-pointer hover:scale-105" />
          <Status className="opacity-0 transition-opacity group-hover:opacity-100 duration-300 pointer-events-none" />
        </div>
      </div>
      <div className="rounded-full overflow-hidden p-1.5 bg-secondary-color cursor-pointer group">
        <img
          className="w-16 aspect-square object-cover rounded-full group-hover:scale-110 active:scale-110 transition-all duration-200"
          src={user?.avatar}
        />
      </div>
    </div>
  );
}
