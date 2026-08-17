export const ROUTES = {
  home: "/",
  gatekeeper: "/gatekeeper",
  profiles: "/profiles",
  login: (username: string) => `/login/${username}`,
  dashboard: "/dashboard",
  statistics: "/statistics",
  notes: "/notes",
  notesCreate: "/notes/create",
  notesView: (title: string) => `/notes/view/${title}`,
  notesEdit: (title: string) => `/notes/edit/${title}`,
  videoAutomation: "/video-automation",
  aiChatbox: "/ai-chatbox",
  editorClips: "/editor-clips",
  editorClip: (savedClipId: string) => `/editor-clips/${savedClipId}`,
  savedClips: "/saved-clips",
} as const;

/** Anciennes routes FR — conservées pour les redirections. */
export const LEGACY_ROUTES = {
  statistics: "/statistiques",
  videoAutomation: "/video-automatisation",
  aiChatbox: "/chatbox-ia",
  editorClips: "/editeur-clips",
  savedClips: "/clips-enregistres",
} as const;
