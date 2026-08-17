import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
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
import { LEGACY_ROUTES, ROUTES } from "./lib/routes";

function LegacyEditorClipRedirect() {
  const { savedClipId } = useParams<{ savedClipId: string }>();
  if (!savedClipId) {
    return <Navigate to={ROUTES.editorClips} replace />;
  }
  return <Navigate to={ROUTES.editorClip(savedClipId)} replace />;
}

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
          <Route path={ROUTES.gatekeeper} element={<GatekeeperPage />} />

          <Route element={<GateKeeperGuard />}>
            <Route path={ROUTES.profiles} element={<ProfilesPage />} />
            <Route path="/login/:username" element={<LoginPage />} />
            <Route element={<AuthGuard />}>
              <Route path={ROUTES.home} element={<HomePage />} />
              <Route path={ROUTES.dashboard} element={<DashboardPage />} />
              <Route path={ROUTES.statistics} element={<StatistiquesPage />} />
              <Route path={ROUTES.notes} element={<NotesPage />} />
              <Route path="/notes/view/:title" element={<ViewNotePage />} />
              <Route path="/notes/edit/:title" element={<NoteEditingPage />} />
              <Route path={ROUTES.notesCreate} element={<NoteCreationPage />} />
              <Route
                path={ROUTES.videoAutomation}
                element={<VideosAutomatisationPage />}
              />
              <Route path={ROUTES.aiChatbox} element={<ChatboxIAPage />} />
              <Route path={ROUTES.editorClips} element={<ClipEditorPage />} />
              <Route
                path="/editor-clips/:savedClipId"
                element={<ClipEditorPage />}
              />
              <Route path={ROUTES.savedClips} element={<SavedClipsPage />} />

              {/* Redirections anciennes routes FR */}
              <Route
                path={LEGACY_ROUTES.statistics}
                element={<Navigate to={ROUTES.statistics} replace />}
              />
              <Route
                path={LEGACY_ROUTES.videoAutomation}
                element={<Navigate to={ROUTES.videoAutomation} replace />}
              />
              <Route
                path={LEGACY_ROUTES.aiChatbox}
                element={<Navigate to={ROUTES.aiChatbox} replace />}
              />
              <Route
                path={LEGACY_ROUTES.editorClips}
                element={<Navigate to={ROUTES.editorClips} replace />}
              />
              <Route
                path={`${LEGACY_ROUTES.editorClips}/:savedClipId`}
                element={<LegacyEditorClipRedirect />}
              />
              <Route
                path={LEGACY_ROUTES.savedClips}
                element={<Navigate to={ROUTES.savedClips} replace />}
              />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
