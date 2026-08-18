import LegalDocumentLayout, {
  LegalList,
  LegalParagraph,
  LegalSection,
} from "../../components/global/LegalDocumentLayout";

const UPDATED_AT = "18 août 2026";

export default function TermsOfServicePage() {
  return (
    <>
      <title>Conditions d&apos;utilisation - 10banc</title>
      <LegalDocumentLayout
        title="Conditions d'utilisation"
        subtitle="Application web privée 10banc / QG10banc — accès réservé à l'équipe autorisée."
        updatedAt={UPDATED_AT}
      >
        <LegalSection title="1. Objet">
          <LegalParagraph>
            Les présentes conditions régissent l&apos;accès et l&apos;utilisation de
            l&apos;application web 10banc (ci-après « l&apos;Application »), incluant
            notamment l&apos;éditeur de clips verticaux, les outils de montage et les
            fonctionnalités de publication vers des plateformes tierces (TikTok,
            YouTube, etc.).
          </LegalParagraph>
          <LegalParagraph>
            L&apos;Application est un outil interne mis à disposition des membres
            autorisés de l&apos;équipe 10banc. Elle n&apos;est pas destinée au public
            général.
          </LegalParagraph>
        </LegalSection>

        <LegalSection title="2. Accès et compte">
          <LegalList
            items={[
              "L'accès à l'Application nécessite une authentification et une autorisation préalable.",
              "Chaque utilisateur est responsable de la confidentialité de ses identifiants.",
              "Toute activité réalisée depuis un compte autorisé est réputée effectuée par son titulaire.",
            ]}
          />
        </LegalSection>

        <LegalSection title="3. Utilisation autorisée">
          <LegalParagraph>
            L&apos;Application permet d&apos;importer, monter, exporter et publier des
            contenus vidéo courts. L&apos;utilisateur s&apos;engage à :
          </LegalParagraph>
          <LegalList
            items={[
              "Respecter les droits d'auteur et les conditions des plateformes connectées (TikTok, YouTube, Twitch, etc.).",
              "Ne publier que des contenus dont il détient les droits ou l'autorisation de diffusion.",
              "Utiliser les intégrations API (Login Kit, Content Posting API TikTok, etc.) uniquement pour publier sur les comptes qu'il contrôle ou est autorisé à gérer.",
              "Ne pas tenter de contourner les mesures de sécurité de l'Application.",
            ]}
          />
        </LegalSection>

        <LegalSection title="4. Contenus et propriété">
          <LegalParagraph>
            Les contenus importés, montés ou exportés via l&apos;Application restent
            sous la responsabilité de leur auteur. 10banc fournit l&apos;outil technique
            mais n&apos;endosse aucune responsabilité quant au contenu publié par les
            utilisateurs autorisés.
          </LegalParagraph>
          <LegalParagraph>
            Les éléments propres à l&apos;Application (interface, code, marque 10banc)
            restent la propriété de leurs titulaires respectifs.
          </LegalParagraph>
        </LegalSection>

        <LegalSection title="5. Services tiers">
          <LegalParagraph>
            L&apos;Application s&apos;appuie sur des services tiers (hébergement,
            APIs TikTok/YouTube/Twitch, transcription, catalogues de sons, etc.). Leur
            disponibilité et leurs règles peuvent évoluer indépendamment de 10banc.
          </LegalParagraph>
          <LegalParagraph>
            En connectant un compte TikTok, l&apos;utilisateur accepte également les
            conditions de TikTok for Developers et les politiques de TikTok.
          </LegalParagraph>
        </LegalSection>

        <LegalSection title="6. Limitation de responsabilité">
          <LegalParagraph>
            L&apos;Application est fournie « en l&apos;état ». 10banc ne garantit pas
            un fonctionnement ininterrompu ni l&apos;absence d&apos;erreurs. En cas de
            perte de données, d&apos;échec d&apos;export ou de publication, l&apos;équipe
            s&apos;efforce de corriger les incidents mais ne peut être tenue responsable
            des dommages indirects liés à l&apos;usage de l&apos;outil.
          </LegalParagraph>
        </LegalSection>

        <LegalSection title="7. Suspension">
          <LegalParagraph>
            L&apos;accès peut être suspendu ou révoqué en cas de violation des
            présentes conditions, d&apos;usage abusif des APIs ou de comportement
            contraire aux intérêts de l&apos;équipe 10banc.
          </LegalParagraph>
        </LegalSection>

        <LegalSection title="8. Contact">
          <LegalParagraph>
            Pour toute question relative à ces conditions :{" "}
            <a
              href="mailto:10banc.officiel@gmail.com"
              className="font-semibold text-main-color underline-offset-2 hover:underline"
            >
              10banc.officiel@gmail.com
            </a>
          </LegalParagraph>
        </LegalSection>
      </LegalDocumentLayout>
    </>
  );
}
