import { LANGUAGES } from "@passaporte/shared";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, type Me } from "./api.ts";

interface SessionValue {
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Tag de voz do idioma ativo (en-US / es-ES) */
  speechTag: string;
}

const SessionContext = createContext<SessionValue>({ me: null, loading: true, refresh: async () => {}, speechTag: "en-US" });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setMe(await api<Me>("/me"));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setMe(null);
      else throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const speechTag = LANGUAGES[me?.member.active_lang ?? "en"].speechTag;
  return <SessionContext.Provider value={{ me, loading, refresh, speechTag }}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

/** Carrega dados de uma rota da API, com recarregamento manual. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api<T>(path));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}
