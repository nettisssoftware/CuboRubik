import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/contacto")({
  head: () => ({
    meta: [
      { title: "Contacto | Zun Cube Simulator" },
      { name: "description", content: "Contacta con Nettiss Software para consultas, sugerencias y soporte de Zun Cube Simulator." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://cuborubikgame.vercel.app/contacto" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <LegalPage
      title="Contacto"
      updated="25 de noviembre de 2026"
      description="Canal oficial para consultas, sugerencias, reportes técnicos y comunicaciones relacionadas con el simulador."
    >
      <h2>Atención y soporte</h2>
      <p>Para consultas generales, sugerencias, comentarios o reportes de errores de Zun Cube Simulator, puedes escribir a:</p>
      <p><a href="mailto:nettisssoftware@gmail.com">nettisssoftware@gmail.com</a></p>
      <p>Si informas de un problema técnico, puedes incluir el modelo de tu dispositivo, sistema operativo, navegador y una descripción de los pasos que provocan el error. No envíes contraseñas, documentos personales ni información sensible.</p>

      <h2>Agradecimientos</h2>
      <p>En primer lugar, agradecemos a Dios, por ser fuente de inspiración, fortaleza y guía durante el desarrollo de este proyecto.</p>
      <p>También reconocemos el apoyo de las herramientas de inteligencia artificial utilizadas durante el proceso creativo y técnico. En particular, ChatGPT, desarrollado por OpenAI, colaboró como asistente en la exploración de ideas, documentación, revisión y razonamiento técnico. La dirección del proyecto, las decisiones finales y su mantenimiento corresponden a Nettiss Software.</p>
      <p>Gracias también a quienes prueban el simulador, comunican errores y acompañan su evolución.</p>

      <h2>Tecnologías utilizadas</h2>
      <p>Zun Cube Simulator se construye con tecnologías web y de gráficos 3D. Puedes consultar sus páginas oficiales:</p>
      <ul>
        <li><a href="https://react.dev/" target="_blank" rel="noreferrer">React</a> — interfaz de usuario.</li>
        <li><a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer">TypeScript</a> — tipado del código.</li>
        <li><a href="https://threejs.org/" target="_blank" rel="noreferrer">Three.js</a> — gráficos 3D.</li>
        <li><a href="https://r3f.docs.pmnd.rs/" target="_blank" rel="noreferrer">React Three Fiber</a> — integración de Three.js con React.</li>
        <li><a href="https://tanstack.com/start" target="_blank" rel="noreferrer">TanStack Start</a> — estructura de la aplicación.</li>
        <li><a href="https://vite.dev/" target="_blank" rel="noreferrer">Vite</a> — herramientas de desarrollo y compilación.</li>
        <li><a href="https://tailwindcss.com/" target="_blank" rel="noreferrer">Tailwind CSS</a> — estilos.</li>
        <li><a href="https://zustand.docs.pmnd.rs/" target="_blank" rel="noreferrer">Zustand</a> — gestión de estado.</li>
        <li><a href="https://vercel.com/" target="_blank" rel="noreferrer">Vercel</a> — alojamiento y despliegue.</li>
        <li><a href="https://fonts.google.com/" target="_blank" rel="noreferrer">Google Fonts</a> — recursos tipográficos.</li>
      </ul>

      <h2>Referencias legales y de privacidad</h2>
      <ul>
        <li><a href="https://www.bacn.gov.py/leyesparaguayas/9580/constitucion-nacional" target="_blank" rel="noreferrer">Constitución Nacional de la República del Paraguay</a>.</li>
        <li><a href="https://www.bacn.gov.py/leyes-paraguayas/12924/ley-n-7593-2025-de-proteccion-de-datos-personales-en-la-republica-del-paraguay" target="_blank" rel="noreferrer">Ley N.º 7593/2025 de Protección de Datos Personales</a>.</li>
        <li><a href="https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/" target="_blank" rel="noreferrer">Reglamento General de Protección de Datos de la Unión Europea (RGPD)</a>.</li>
        <li><a href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noreferrer">Aviso de privacidad de Vercel</a>.</li>
        <li><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Política de privacidad de Google</a>.</li>
      </ul>
    </LegalPage>
  );
}
