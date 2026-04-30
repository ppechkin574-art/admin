import { useContext } from "react";
import { AuthContext } from "@/providers/AuthProvider";

export const useKeycloakAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useKeycloakAuth must be used within AuthProvider");
  return ctx;
};

export default useKeycloakAuth;
