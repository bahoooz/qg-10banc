import { useUsers } from "../hooks/useUsers";
import type { User } from "../../types";
import { Link } from "react-router-dom";
import Loading from "../components/global/Loading";

export default function ProfilesPage() {
  const { data: users, isLoading, isError } = useUsers();

  if (isLoading) return <Loading />;
  if (isError) return <p>Une erreur est survenue.</p>;
  return (
    <>
    <title>Choisir un profil - QG10banc</title>
      <div className="relative md:flex items-center justify-center md:gap-24 lg:gap-32 xl:gap-40">
        <h1 className="text-3xl md:text-5xl top-14 whitespace-nowrap left-1/2 -translate-x-1/2 md:translate-x-0 absolute md:static md:mb-64">
          Qui est-ce ?
        </h1>
        <div className="h-dvh w-full md:w-fit flex justify-center items-center">
          <div className="flex flex-col gap-6 xs:gap-8 md:gap-4 mt-20 md:mt-0">
            {users?.map((user: User) => (
              <Link
                to={`/login/${user.username}`}
                key={user.id}
                className="flex items-center gap-6 rounded-3xl hover:scale-105 active:scale-95 transition-all duration-100 hover:shadow-2xl md:p-4"
              >
                <img
                  src={user.avatar}
                  width={160}
                  height={160}
                  alt={`Logo ${user.username}`}
                  className="w-28 rounded-full aspect-square object-cover"
                />
                <h3 className="text-xl">{user.username}</h3>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
