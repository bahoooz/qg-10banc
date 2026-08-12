import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function InputAccess() {
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/gatekeeper/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            password,
          }),
        }
      );

      if (res.ok) {
        navigate("/profiles");
        toast.success("Bienvenue dans l'équipe")
      } else {
        toast.error("Cette zone est privée")
      }
    } catch {
      toast.error("Erreur inconnue")
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="text-white flex flex-col gap-4 w-full xs:max-w-[500px]"
    >
      <label htmlFor="">Code d'accès QG 10banc</label>
      <div className="relative">
        <input
          type={isPasswordHidden ? "password" : "text"}
          className="bg-secondary-color h-14 rounded-xl w-full outline-none px-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
      <div className="flex justify-end">
        <button
          type="submit"
          className="w-fit px-6 py-4 bg-secondary-color rounded-xl cursor-pointer transition-all hover:scale-[102%] active:scale-95"
        >
          Vérifier
        </button>
      </div>
    </form>
  );
}
