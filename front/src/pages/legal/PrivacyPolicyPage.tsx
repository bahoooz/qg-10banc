import LegalDocumentLayout, {
  LegalList,
  LegalParagraph,
  LegalSection,
} from "../../components/global/LegalDocumentLayout";

const UPDATED_AT = "18 août 2026";

export default function PrivacyPolicyPage() {
  return (
    <>
      <title>Politique de confidentialité - 10banc</title>
      <LegalDocumentLayout
        title="Politique de confidentialité"
        subtitle="Comment 10banc / QG10banc traite les données dans le cadre de l'application privée."
        updatedAt={UPDATED_AT}
      >
        <LegalSection title="1. Responsable du traitement">
          <LegalParagraph>
            L&apos;application 10banc (QG10banc) est exploitée par l&apos;équipe 10banc
            pour un usage interne autorisé. Contact :{" "}
            <a
              href="mailto:10banc.officiel@gmail.com"
              className="font-semibold text-main-color underline-offset-2 hover:underline"
            >
              10banc.officiel@gmail.com
            </a>
          </LegalParagraph>
        </LegalSection>

        <LegalSection title="2. Données collectées">
          <LegalParagraph>
            Selon les fonctionnalités utilisées, l&apos;Application peut traiter :
          </LegalParagraph>
          <LegalList
            items={[
              "Identifiants de compte et données de session (authentification interne).",
              "Profils connectés sur TikTok, YouTube ou Twitch (nom, avatar, identifiants OAuth, tokens d'accès chiffrés côté serveur).",
              "Fichiers vidéo/audio importés, projets de montage (clips, segments, effets, sous-titres) et métadonnées associées.",
              "Journaux techniques (erreurs, activité API) pour la maintenance et le débogage.",
            ]}
          />
        </LegalSection>

        <LegalSection title="3. Finalités">
          <LegalList
            items={[
              "Permettre l'édition et l'export de clips verticaux.",
              "Sauvegarder les projets et l'état de l'éditeur.",
              "Publier des vidéos sur les comptes sociaux connectés, avec consentement explicite de l'utilisateur à chaque publication.",
              "Assurer la sécurité, la stabilité et l'amélioration de l'Application.",
            ]}
          />
        </LegalSection>

        <LegalSection title="4. Intégrations TikTok et autres plateformes">
          <LegalParagraph>
            Lorsque vous connectez TikTok via Login Kit, nous recevons les informations
            autorisées par les scopes demandés (profil de base, statistiques créateur le
            cas échéant). Les tokens OAuth sont stockés de manière sécurisée sur nos
            serveurs et ne sont utilisés que pour les actions que vous déclenchez
            (consultation des infos créateur, upload ou publication de vidéos).
          </LegalParagraph>
          <LegalParagraph>
            Nous ne vendons pas vos données et ne les partageons pas avec des tiers à
            des fins publicitaires.
          </LegalParagraph>
        </LegalSection>

        <LegalSection title="5. Hébergement et conservation">
          <LegalParagraph>
            Les données sont hébergées sur l&apos;infrastructure utilisée par 10banc
            (serveur applicatif, base de données, stockage fichiers). Les projets clips
            et médias sont conservés tant que l&apos;équipe en a besoin pour produire du
            contenu, puis peuvent être supprimés selon la politique interne de
            rétention.
          </LegalParagraph>
        </LegalSection>

        <LegalSection title="6. Vos droits">
          <LegalParagraph>
            Conformément au RGPD, vous pouvez demander l&apos;accès, la rectification ou
            la suppression de vos données personnelles, ainsi que la révocation des
            connexions OAuth, en contactant{" "}
            <a
              href="mailto:10banc.officiel@gmail.com"
              className="font-semibold text-main-color underline-offset-2 hover:underline"
            >
              10banc.officiel@gmail.com
            </a>
            .
          </LegalParagraph>
        </LegalSection>

        <LegalSection title="7. Cookies et sessions">
          <LegalParagraph>
            L&apos;Application utilise des cookies de session strictement nécessaires à
            l&apos;authentification et au fonctionnement sécurisé. Aucun cookie
            publicitaire n&apos;est déposé par 10banc dans le cadre de cet outil interne.
          </LegalParagraph>
        </LegalSection>

        <LegalSection title="8. Modifications">
          <LegalParagraph>
            Cette politique peut être mise à jour. La date en tête de page indique la
            dernière révision. L&apos;usage continu de l&apos;Application vaut acceptation
            de la version en vigueur.
          </LegalParagraph>
        </LegalSection>
      </LegalDocumentLayout>
    </>
  );
}
