import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.tsx";
import { useSession } from "./lib/session.tsx";
import { Family } from "./pages/Family.tsx";
import { Home } from "./pages/Home.tsx";
import { Placement } from "./pages/Placement.tsx";
import { Read } from "./pages/Read.tsx";
import { Review } from "./pages/Review.tsx";
import { Settings } from "./pages/Settings.tsx";
import { Shadow } from "./pages/Shadow.tsx";
import { Talk } from "./pages/Talk.tsx";
import { Welcome } from "./pages/Welcome.tsx";

export function App() {
  const { me, loading } = useSession();

  if (loading) return <div className="grid min-h-dvh place-items-center text-muted">Carregando…</div>;
  if (!me) return <Welcome />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="revisar" element={<Review />} />
        <Route path="ler" element={<Read />} />
        <Route path="shadowing" element={<Shadow />} />
        <Route path="conversar" element={<Talk />} />
        <Route path="nivelamento" element={<Placement />} />
        <Route path="familia" element={<Family />} />
        <Route path="ajustes" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
