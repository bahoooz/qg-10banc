import { useParams } from "react-router-dom";
import { useSpecificUser } from "../hooks/useSpecificUser";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { useLogin } from "../hooks/useLogin";
import { useNavigate } from "react-router-dom";
import Loading from "../components/global/Loading";

export default function LoginPage() {
  const { username } = useParams<{ username: string }>();
  const { data: user, isLoading } = useSpecificUser(String(username));
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  if (!username) navigate("/profiles");
  const login = useLogin();

  const handleLogin = () => {
    if (!username) return;

    const passwordSchema = z.string().min(1, "Le mot de passe est requis");

    const passwordStatus = passwordSchema.safeParse(password);

    if (!passwordStatus.success) {
      setError(passwordStatus.error.issues[0].message);
      return;
    }

    setError("");

    login.mutate(
      { username, password },
      {
        onSuccess: () => {
          navigate("/");
        },
      },
    );
  };

  if (isLoading) return <Loading />;
  if (!user) return <p>Accès non autorisé</p>;

  return (
    <>
      <title>Connexion - QG10banc</title>
      <div className="relative h-dvh md:flex md:items-center">
        <h1 className="text-3xl text-center mt-14 md:text-5xl top-10 whitespace-nowrap md:absolute md:left-1/2 md:-translate-x-1/2">
          Ravis de te revoir !
        </h1>
        <div className="mt-12 gap-12 lg:gap-20 flex flex-col md:flex-row items-center md:mx-auto md:min-w-[700px] md:w-full md:max-w-[800px] lg:max-w-[850px]">
          <div className="relative w-48 xs:w-52 md:w-80 aspect-square rounded-full overflow-hidden">
            <h3 className="absolute top-1/2 left-1/2 -translate-1/2 z-10 text-2xl xs:text-3xl">
              {user.username}
            </h3>
            <div className="w-full h-full absolute bg-black/50"></div>
            <img
              className="w-full h-full object-cover"
              src={user.avatar}
              alt={`${user.username} logo`}
            />
          </div>
          <div className="w-full">
            <div className="flex flex-col gap-4">
              <label htmlFor="">Mot de passe</label>
              <div className="relative">
                <input
                  type={isPasswordHidden ? "password" : "text"}
                  className={`bg-secondary-color h-14 rounded-xl w-full outline-none px-4 ${
                    error || login.isError ? "border-2 border-red-500" : ""
                  }`}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                    if (login.isError) login.reset();
                  }}
                  value={password}
                  // Petit ajout UX : valider avec "Entrée"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  disabled={login.isPending}
                />
                {isPasswordHidden ? (
                  <Eye
                    strokeWidth={2}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-110"
                    onClick={() => setIsPasswordHidden(!isPasswordHidden)}
                  />
                ) : (
                  <EyeOff
                    strokeWidth={2}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-110"
                    onClick={() => setIsPasswordHidden(!isPasswordHidden)}
                  />
                )}
              </div>

              <p className="text-sm">
                Saisis ton mot de passe pour pouvoir te connecter
              </p>

              {/* Affichage des erreurs (Local + API) */}
              {(error || login.isError) && (
                <p className="text-red-500 text-sm font-medium animate-pulse">
                  {error || login.error?.message}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row md:justify-between gap-4 mt-8">
              <button
                onClick={handleLogin}
                disabled={login.isPending}
                className="w-full sm:w-2/3 md:w-fit px-6 py-4 bg-secondary-color rounded-xl cursor-pointer transition-all hover:scale-[102%] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {login.isPending ? "Connexion..." : "Se connecter"}
              </button>
              <button className="w-full sm:w-1/3 md:w-fit px-6 py-4 bg-tertiary-color rounded-xl cursor-pointer transition-all hover:scale-[102%] active:scale-95">
                Mot de passe oublié
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
