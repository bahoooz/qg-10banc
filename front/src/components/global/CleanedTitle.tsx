import { useLocation } from "react-router-dom";

export default function CleanedTitle() {
  const location = useLocation();
  const path = location.pathname;

  let title = "";

  if (path === "/notes/create") {
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
  } else if (path === "/") {
    title = "Accueil";
  } else if (path.startsWith("/login/")) {
    title = "";
  } else if (path.startsWith("/video-automatisation")) {
    title = "Vidéos automatisées";
  } else if (path.startsWith("/editeur-clips")) {
    title = "Éditeur de clips";
  } else if (path.startsWith("/chatbox-ia")) {
    title = "Chatbox IA";
  } else {
    title = path.replaceAll("/", " ");
  }

  return <>{title}</>;
}
