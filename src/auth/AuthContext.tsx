import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getBarbaraSupabaseKeyDebugInfo, resolvedSupabaseUrl, supabase } from "../lib/supabase";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (mounted) {
        setSession(s);
        setLoading(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const emailTrimmed = email.trim();
    // Password is passed through unchanged (no trim — avoids breaking intentional spaces).
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailTrimmed,
      password,
    });

    if (error) {
      const err = error as Error & { status?: number; code?: string };
      // TEMPORARY (Barbara login debug — safe: no full anon key)
      console.error("[Barbara Login Debug] signInWithPassword failed", {
        supabaseUrlUsed: resolvedSupabaseUrl || "(missing)",
        ...getBarbaraSupabaseKeyDebugInfo(),
        emailUsed: emailTrimmed,
        passwordLength: password.length,
        authErrorMessage: error.message,
        authErrorStatus: err.status,
        authErrorCode: err.code,
        authErrorName: error.name,
      });
      return { error: new Error(error.message) };
    }

    if (import.meta.env.DEV && data.session) {
      console.info("[Barbara Login Debug] signInWithPassword ok", { emailUsed: emailTrimmed });
    }

    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [session, loading, signIn, signUp, signOut]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
