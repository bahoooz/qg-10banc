import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../lib/routes";

type LegalDocumentLayoutProps = {
  title: string;
  subtitle: string;
  updatedAt: string;
  children: ReactNode;
};

export default function LegalDocumentLayout({
  title,
  subtitle,
  updatedAt,
  children,
}: LegalDocumentLayoutProps) {
  return (
    <div className="min-h-dvh bg-black-perso pb-16 pt-28 text-white/85 md:pt-32">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <header className="mb-10 border-b border-secondary-color/40 pb-8">
          <p className="mb-2 text-sm font-extrabold uppercase tracking-[0.2em] text-main-color">
            10banc · QG10banc
          </p>
          <h1 className="text-3xl font-extrabold uppercase tracking-wide md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-white/45 md:text-base">{subtitle}</p>
          <p className="mt-4 text-xs text-white/30">Dernière mise à jour : {updatedAt}</p>
        </header>

        <article className="space-y-8 text-sm leading-relaxed text-white/75 md:text-base">
          {children}
        </article>

        <footer className="mt-12 flex flex-wrap gap-4 border-t border-secondary-color/30 pt-8 text-xs font-extrabold uppercase tracking-wide">
          <Link
            to={ROUTES.legal.terms}
            className="text-white/45 transition-colors hover:text-main-color"
          >
            Conditions d&apos;utilisation
          </Link>
          <Link
            to={ROUTES.legal.privacy}
            className="text-white/45 transition-colors hover:text-main-color"
          >
            Politique de confidentialité
          </Link>
          <a
            href="https://10banc.com"
            className="text-white/45 transition-colors hover:text-main-color"
          >
            10banc.com
          </a>
        </footer>
      </div>
    </div>
  );
}

type LegalSectionProps = {
  title: string;
  children: ReactNode;
};

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="rounded-2xl border border-secondary-color/35 bg-background-secondary/70 p-5 md:p-6">
      <h2 className="mb-3 text-lg font-extrabold uppercase tracking-wide text-main-color">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function LegalParagraph({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-main-color/70">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
