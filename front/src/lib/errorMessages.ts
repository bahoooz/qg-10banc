export class ApiError extends Error {
  errorCode?: string;
  details?: Record<string, string[]>; // Type parfait pour le retour de Zod fieldErrors

  constructor(
    message: string,
    errorCode?: string,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.errorCode = errorCode;
    this.details = details;
  }
}

const ERROR_DICTIONARY: Record<string, string> = {
  USER_NOT_FOUND: "Utilisateur introuvable",
  SESSION_NOT_FOUND:
    "Votre session est invalide ou expirée. Veuillez vous reconnecter.",
  VALIDATION_ERROR:
    "Veuillez vérifier les informations saisies dans le formulaire.",
  NOTE_ALREADY_EXISTS: "Une note avec ce titre existe déjà.",
  NOTE_NOT_FOUND: "La note est introuvable.",
  INTERNAL_SERVER_ERROR: "Erreur interne du serveur",
  ACCOUNT_ALREADY_EXISTS:
    "Un compte existe déjà avec cet email et/ou ce nom d'utilisateur",
  INVALID_CREDENTIALS:
    "Identifiants invalides. Veuillez vérifier votre email et votre mot de passe.",
  // Ajoute tes futurs codes ici...
};

export const getErrorMessage = (errorCode?: string): string => {
  if (!errorCode) return ERROR_DICTIONARY.INTERNAL_SERVER_ERROR;
  return ERROR_DICTIONARY[errorCode] || ERROR_DICTIONARY.INTERNAL_SERVER_ERROR;
};
