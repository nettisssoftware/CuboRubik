import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/terminos")({
  head: () => ({
    meta: [
      { title: "Términos de uso | Zun Cube Simulator" },
      { name: "description", content: "Condiciones para utilizar Zun Cube Simulator, sus funciones y contenidos." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://cuborubikgame.vercel.app/terminos" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      title="Términos de uso"
      updated="25 de noviembre de 2026"
      description="Estas condiciones establecen las reglas básicas para acceder y utilizar Zun Cube Simulator."
    >
      <h2>1. Aceptación</h2>
      <p>Al acceder o utilizar Zun Cube Simulator aceptas estos términos. Si no estás de acuerdo, debes dejar de utilizar el sitio. El uso del simulador también está sujeto a las normas obligatorias de protección de consumidores y demás disposiciones que resulten aplicables.</p>

      <h2>2. Descripción del servicio</h2>
      <p>Zun Cube Simulator es un simulador web interactivo de cubo 3×3 que permite girar sus piezas, modificar determinados ajustes visuales y de control, y practicar la resolución del rompecabezas desde un navegador compatible. Las funciones disponibles pueden cambiar con las actualizaciones.</p>
      <p>El acceso al simulador es gratuito en su versión actual. No se ofrecen actualmente compras integradas, suscripciones ni pagos dentro del juego.</p>

      <h2>3. Uso permitido</h2>
      <p>Te comprometes a utilizar el sitio de forma lícita y razonable. No debes:</p>
      <ul>
        <li>Intentar acceder sin autorización a servidores, cuentas, sistemas o información que no te pertenezcan.</li>
        <li>Interferir con la disponibilidad, seguridad o funcionamiento del sitio, ni introducir código malicioso.</li>
        <li>Utilizar el servicio para actividades ilícitas, fraudulentas o que vulneren derechos de terceros.</li>
        <li>Eliminar avisos de titularidad o atribución de los materiales cuando corresponda.</li>
      </ul>

      <h2>4. Propiedad intelectual y marcas</h2>
      <p>La marca ZUN CUBE, el símbolo 尊 y los elementos originales de identidad, interfaz y software desarrollados para el proyecto pertenecen a sus respectivos titulares. Los nombres, marcas, bibliotecas y componentes de terceros continúan perteneciendo a sus propietarios y se utilizan conforme a sus licencias o derechos aplicables.</p>
      <p>Zun Cube Simulator es un proyecto independiente. No está afiliado, patrocinado ni respaldado por los titulares de la marca Rubik's ni por fabricantes de cubos físicos. Las referencias al cubo de Rubik se utilizan para describir el tipo de rompecabezas simulado; las marcas de terceros conservan todos sus derechos.</p>
      <p>No se concede permiso para copiar, redistribuir o explotar comercialmente los elementos originales del proyecto salvo autorización expresa o cuando una licencia aplicable lo permita. Esta cláusula no limita los derechos que la ley reconozca al usuario.</p>

      <h2>5. Funcionamiento y disponibilidad</h2>
      <p>El servicio se proporciona en el estado en que se encuentra y según disponibilidad. Aunque se procura mantenerlo operativo, no se garantiza acceso ininterrumpido, ausencia total de errores, compatibilidad con todos los dispositivos ni conservación permanente del progreso local. Las actualizaciones del navegador, la limpieza de almacenamiento o fallos del dispositivo pueden ocasionar la pérdida de preferencias o partidas guardadas.</p>
      <p>El usuario es responsable de mantener su navegador actualizado y de gestionar el almacenamiento local de su dispositivo.</p>

      <h2>6. Limitación de responsabilidad</h2>
      <p>En la máxima medida permitida por la legislación aplicable, Nettiss Software no será responsable por interrupciones causadas por proveedores externos, problemas de conectividad, incompatibilidades del dispositivo, pérdida de datos locales o uso contrario a estos términos. Nada de lo aquí dispuesto excluye o limita responsabilidades que legalmente no puedan excluirse, incluidos los supuestos de dolo, culpa grave o derechos irrenunciables del consumidor.</p>

      <h2>7. Servicios y enlaces de terceros</h2>
      <p>El sitio puede cargar recursos de terceros, como tipografías de Google Fonts, y utiliza infraestructura de alojamiento de Vercel. Los servicios externos se rigen por sus propias condiciones y políticas. Nettiss Software no controla los sitios externos enlazados ni garantiza su disponibilidad o contenido.</p>

      <h2>8. Privacidad</h2>
      <p>El tratamiento de información técnica y el almacenamiento local se describen en la <a href="/privacidad">Política de privacidad</a>, que forma parte de estas condiciones en lo que resulte aplicable.</p>

      <h2>9. Modificaciones y suspensión</h2>
      <p>Podemos actualizar, modificar o retirar funciones del simulador por razones técnicas, de seguridad, mantenimiento o evolución del proyecto. También podemos limitar el acceso cuando sea necesario para proteger el servicio frente a usos abusivos o ilícitos. Las modificaciones de estos términos se publicarán en esta página con su fecha de actualización.</p>

      <h2>10. Legislación aplicable</h2>
      <p>Estos términos se interpretarán conforme a las leyes de la República del Paraguay, sin perjuicio de las normas imperativas de protección al consumidor o de protección de datos que resulten aplicables por razón de la residencia del usuario o del alcance territorial del servicio. Entre las referencias relevantes se encuentran la <a href="https://www.bacn.gov.py/leyesparaguayas/9580/constitucion-nacional" target="_blank" rel="noreferrer">Constitución Nacional paraguaya</a> y la <a href="https://www.bacn.gov.py/leyes-paraguayas/12924/ley-n-7593-2025-de-proteccion-de-datos-personales-en-la-republica-del-paraguay" target="_blank" rel="noreferrer">Ley N.º 7593/2025 de Protección de Datos Personales</a>. El artículo 57 de esta ley establece un período de 24 meses desde su publicación oficial para su entrada en vigor.</p>
      <p>Si alguna disposición de estos términos fuera declarada inválida, las demás conservarán su validez en la medida permitida por la ley.</p>

      <h2>11. Contacto</h2>
      <p>Para consultas sobre estos términos, escribe a <a href="mailto:nettisssoftware@gmail.com">nettisssoftware@gmail.com</a>.</p>
    </LegalPage>
  );
}
