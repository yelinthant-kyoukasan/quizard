import { createContext } from "react";
import type { AuthUser } from "./authTypes";

export type AuthContextValue = {
    user: AuthUser | null;
    loading: boolean;
    setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
    refreshMe: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
