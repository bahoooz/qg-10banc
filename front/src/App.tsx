import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import LogoHeader from "./components/global/LogoHeader";
import GatekeeperPage from "./pages/GatekeeperPage";
import GateKeeperGuard from "./components/Guards/GateKeeperGuard";
import ProfilesPage from "./pages/ProfilesPage";
import LoginPage from "./pages/LoginPage";
import AuthGuard from "./components/Guards/AuthGuard";
import HomePage from "./pages/HomePage";
import SessionMenu from "./components/global/SessionMenu";
import NotesPage from "./pages/NotesPage";
import DashboardPage from "./pages/DashboardPage";
import StatistiquesPage from "./pages/StatistiquesPage";
import ChatboxIAPage from "./pages/ChatboxIAPage";
import VideosAutomatisationPage from "./pages/VideosAutomatisationPage";
import ClipEditorPage from "./pages/ClipEditorPage";
import SavedClipsPage from "./pages/SavedClipsPage";
import TitlePage from "./components/global/TitlePage";
import NoteCreationPage from "./pages/NoteCreationPage";
import ViewNotePage from "./pages/ViewNotePage";
import NoteEditingPage from "./pages/NoteEditingPage";
import { useHeartbeat } from "./hooks/useHeartbeat";
import { Toaster } from "./components/ui/sonner";

function App() {
  useHeartbeat(30000);
  return (
    <div className="relative bg-black-perso font-sans">
      <BrowserRouter>
        <LogoHeader />
        <TitlePage />
        <SessionMenu />
        <Toaster />
        <Routes>
          <Route path="/gatekeeper" element={<GatekeeperPage />} />

          <Route element={<GateKeeperGuard />}>
            <Route path="/profiles" element={<ProfilesPage />} />
            <Route path="/login/:username" element={<LoginPage />} />
            <Route element={<AuthGuard />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/statistiques" element={<StatistiquesPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/notes/view/:title" element={<ViewNotePage />} />
              <Route path="/notes/edit/:title" element={<NoteEditingPage />} />
              <Route path="/notes/create" element={<NoteCreationPage />} />
              <Route
                path="/video-automatisation"
                element={<VideosAutomatisationPage />}
              />
              <Route path="/chatbox-ia" element={<ChatboxIAPage />} />
              <Route path="/editeur-clips" element={<ClipEditorPage />} />
              <Route path="/editeur-clips/:savedClipId" element={<ClipEditorPage />} />
              <Route path="/clips-enregistres" element={<SavedClipsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
