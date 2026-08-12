import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loading from "../global/Loading";

export default function AuthGuard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const checkAuthToken = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/auth/login/check`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (res.ok) {
          setIsLoading(false);
        } else {
          navigate("/profiles");
        }
      } catch {
        navigate("/profiles");
      }
    };
    checkAuthToken();
  }, [navigate]);

  if (isLoading) return <Loading />;
  return <>
  <Outlet />
  </>;
}
