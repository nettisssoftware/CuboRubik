import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import "./LegalPage.css";

type Props = {
  title: string;
  updated: string;
  description: string;
  children: ReactNode;
};

export function LegalPage({ title, updated, description, children }: Props) {
  return (
    <main className="legal-page">
      <div className="legal-container">
        <header className="legal-header">
          <Link to="/" className="legal-brand" aria-label="Volver a Zun Cube Simulator">
            <span className="legal-brand-symbol">尊</span>
            <span className="legal-brand-name">ZUN CUBE</span>
          </Link>
          <Link to="/" className="legal-back-link">Volver al simulador</Link>
        </header>
        <article className="legal-article">
          <p className="legal-eyebrow">ZUN CUBE SIMULATOR</p>
          <h1>{title}</h1>
          <p className="legal-description">{description}</p>
          <p className="legal-updated">Última actualización: {updated}</p>
          <div className="legal-content">{children}</div>
        </article>
        <footer className="legal-footer">
          <span>尊</span>
          <span>ZUN CUBE · NETTISS SOFTWARE</span>
          <Link to="/">Regresar al juego</Link>
        </footer>
      </div>
    </main>
  );
}
