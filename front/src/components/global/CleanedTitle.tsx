import { useLocation } from "react-router-dom";
import { LEGACY_ROUTES, ROUTES } from "../../lib/routes";

export default function CleanedTitle() {
  const location = useLocation();
  const path = location.pathname;

  let title = "";

  if (path === ROUTES.notesCreate) {
    title = "Créer une nouvelle note";
  } else if (path.startsWith("/notes/view/")) {
    const prefix = "/notes/view/";
    const firstLetter = path.slice(prefix.length).charAt(0).toUpperCase();
    const restOfString = path.slice(prefix.length + 1).replaceAll("-", " ");
    title = `Note : ${firstLetter + restOfString}`;
  } else if (path.startsWith("/notes/edit/")) {
    const prefix = "/notes/view/";
    const firstLetter = path.slice(prefix.length).charAt(0).toUpperCase();
    const restOfString = path.slice(prefix.length + 1).replaceAll("-", " ");
    title = `Modifier la note : ${firstLetter + restOfString}`;
  } else if (path === ROUTES.home) {
    title = "Accueil";
  } else if (path.startsWith("/login/")) {
    title = "";
  } else if (
    path.startsWith(ROUTES.videoAutomation) ||
    path.startsWith(LEGACY_ROUTES.videoAutomation)
  ) {
    title = "Vidéos automatisées";
  } else if (
    path.startsWith(ROUTES.editorClips) ||
    path.startsWith(LEGACY_ROUTES.editorClips)
  ) {
    title = "Éditeur de clips";
  } else if (
    path.startsWith(ROUTES.savedClips) ||
    path.startsWith(LEGACY_ROUTES.savedClips)
  ) {
    title = "Clips enregistrés";
  } else if (
    path.startsWith(ROUTES.aiChatbox) ||
    path.startsWith(LEGACY_ROUTES.aiChatbox)
  ) {
    title = "Chatbox IA";
  } else if (
    path.startsWith(ROUTES.statistics) ||
    path.startsWith(LEGACY_ROUTES.statistics)
  ) {
    title = "Statistiques";
  } else {
    title = path.replaceAll("/", " ");
  }

  return <>{title}</>;
}
