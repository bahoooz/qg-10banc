import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loading from "../global/Loading";

export default function GateKeeperGuard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const checkGatekeeperToken = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/auth/gatekeeper/check`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (res.ok) {
          setIsLoading(false);
        } else {
          navigate("/gatekeeper");
        }
      } catch {
        navigate("/gatekeeper");
      }
    };
    checkGatekeeperToken();
  }, [navigate]);

  if (isLoading) return <Loading />;
  return <Outlet />;
}
