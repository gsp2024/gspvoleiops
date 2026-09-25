import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Papel = "gestora" | "professor" | "atleta";

export type Perfil = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  documento: string | null;
  foto_url: string | null;
  data_nascimento: string | null;
  posicao: string | null;
  onboarding_completo: boolean;
};

type AuthState = {
  user: User | null;
  session: Session | null;
  perfil: Perfil | null;
  papel: Papel | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  perfil: null,
  papel: null,
  loading: true,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [papel, setPapel] = useState<Papel | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = async (uid: string | undefined) => {
    if (!uid) {
      setPerfil(null);
      setPapel(null);
      return;
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
    ]);
    setPerfil((p as Perfil) ?? null);
    setPapel(((r?.role as Papel) ?? null) as Papel | null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setTimeout(() => {
        void carregar(s?.user?.id).finally(() => setLoading(false));
      }, 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void carregar(data.session?.user?.id).finally(() => setLoading(false));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    await carregar(session?.user?.id);
  };

  return (
    <AuthContext.Provider
      value={{ user: session?.user ?? null, session, perfil, papel, loading, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
