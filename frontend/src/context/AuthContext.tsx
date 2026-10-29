import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../lib/api";

interface AuthUser {
  usuario: string;
  nombre: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (usuario: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem("dhub_user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });

  const login = async (usuario: string, password: string) => {
    const { data } = await authApi.login(usuario, password);
    localStorage.setItem("dhub_token", data.token);
    const authUser = { usuario: data.usuario, nombre: data.nombre };
    localStorage.setItem("dhub_user", JSON.stringify(authUser));
    setUser(authUser);
  };

  const logout = () => {
    localStorage.removeItem("dhub_token");
    localStorage.removeItem("dhub_user");
    setUser(null);
  };

  const updateUser = (updated: AuthUser) => {
    localStorage.setItem("dhub_user", JSON.stringify(updated));
    setUser(updated);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, login, logout, updateUser }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
