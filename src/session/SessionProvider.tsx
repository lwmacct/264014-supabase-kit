import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  signInWithEmailPassword,
  signOutCurrentUser,
  signUpWithEmailPassword,
} from "../services/supabase/auth";
import {
  getSupabaseClient,
  getSupabaseConfigurationError,
  isSupabaseConfigured,
} from "../services/supabase/client";

interface SessionContextValue {
  configured: boolean;
  initializing: boolean;
  session: Session | null;
  user: User | null;
  userEmail: string;
  errorMessage: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ emailConfirmationRequired: boolean }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function buildConfigurationError() {
  return getSupabaseConfigurationError();
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const configured = isSupabaseConfigured;

  function syncSession(nextSession: Session | null) {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
  }

  useEffect(() => {
    if (!configured) {
      syncSession(null);
      setErrorMessage(buildConfigurationError());
      setInitializing(false);
      return;
    }

    const client = getSupabaseClient();
    let active = true;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!active) {
        return;
      }

      syncSession(nextSession);
      setInitializing(false);
      setErrorMessage("");

      if (event === "SIGNED_OUT") {
        void queryClient.removeQueries({ queryKey: ["profile"] });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured, queryClient]);

  async function signIn(email: string, password: string) {
    if (!configured) {
      const message = buildConfigurationError();
      setErrorMessage(message);
      throw new Error(message);
    }

    setErrorMessage("");

    try {
      await signInWithEmailPassword(email, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : "登录失败。";
      setErrorMessage(message);
      throw new Error(message);
    }
  }

  async function signUp(email: string, password: string) {
    if (!configured) {
      const message = buildConfigurationError();
      setErrorMessage(message);
      throw new Error(message);
    }

    setErrorMessage("");

    try {
      return await signUpWithEmailPassword(email, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : "注册失败。";
      setErrorMessage(message);
      throw new Error(message);
    }
  }

  async function signOut() {
    if (!configured) {
      const message = buildConfigurationError();
      setErrorMessage(message);
      throw new Error(message);
    }

    setErrorMessage("");

    try {
      await signOutCurrentUser();
    } catch (error) {
      const message = error instanceof Error ? error.message : "退出失败。";
      setErrorMessage(message);
      throw new Error(message);
    }
  }

  const value = useMemo<SessionContextValue>(() => {
    return {
      configured,
      initializing,
      session,
      user,
      userEmail: user?.email ?? "",
      errorMessage,
      signIn,
      signUp,
      signOut,
      clearError: () => setErrorMessage(""),
    };
  }, [configured, errorMessage, initializing, session, user]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return context;
}
