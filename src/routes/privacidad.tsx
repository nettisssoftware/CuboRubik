import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Política de privacidad | Zun Cube Simulator" },
      { name: "description", content: "Información sobre los datos locales, servicios externos y privacidad de Zun Cube Simulator." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://cuborubikgame.vercel.app/privacidad" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      updated="25 de noviembre de 2026"
      description="Esta política explica qué información interviene cuando utilizas Zun Cube Simulator y cómo puedes gestionarla."
    >
      <h2>1. Responsable y contacto</h2>
      <p>Zun Cube Simulator es un proyecto digital desarrollado y mantenido bajo la marca Nettiss Software. Para consultas relacionadas con privacidad o datos personales puedes escribir a <a href="mailto:nettisssoftware@gmail.com">nettisssoftware@gmail.com</a>.</p>
      <p>El proyecto no publica en esta página un domicilio comercial o una dirección física. El correo indicado es el canal de contacto disponible.</p>

      <h2>2. Información que guarda el simulador en tu dispositivo</h2>
      <p>El juego utiliza el almacenamiento local del navegador (<code>localStorage</code>) para recordar tus preferencias y, si activas la opción correspondiente, tu partida. La clave utilizada actualmente es <code>cubix_settings</code>.</p>
      <ul>
        <li>Preferencias: efectos de sonido, animaciones reducidas, sensibilidad de cámara y piezas, tema, vibración háptica y colores personalizados.</li>
        <li>Progreso de juego: historial de movimientos y estado de la partida, cuando «Guardar progreso local» está activado.</li>
      </ul>
      <p>Las preferencias pueden permanecer guardadas aunque desactives el guardado de progreso; en ese caso, el estado de la partida se descarta y las preferencias continúan almacenándose para conservar tus ajustes. Estos datos se guardan en el navegador de tu propio dispositivo y la lógica actual del simulador no los envía a una base de datos del juego.</p>
      <p>Puedes borrar el progreso y los ajustes desde Configuración → Datos → «Borrar progreso guardado», o eliminar los datos del sitio desde la configuración de tu navegador. Si borras los datos del navegador, también puedes perder la partida guardada.</p>

      <h2>3. Datos técnicos y proveedores externos</h2>
      <p>El sitio está alojado en infraestructura de Vercel. Como ocurre al visitar un sitio web, el proveedor de alojamiento y su red de distribución pueden procesar datos técnicos de las solicitudes, como dirección IP, fecha y hora, navegador, dispositivo, información de conexión, registros de funcionamiento y seguridad. El tratamiento que realiza Vercel se rige también por su propia <a href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noreferrer">Política de privacidad</a>.</p>
      <p>El código de estilos solicita tipografías a Google Fonts. Para entregar esos recursos, el navegador se conecta a servidores de Google y transmite la información técnica necesaria para la conexión, incluida la dirección IP. Puedes consultar la <a href="https://developers.google.com/fonts/faq" target="_blank" rel="noreferrer">información de privacidad de Google Fonts</a> y la <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Política de privacidad de Google</a>.</p>
      <p>La implementación actual no incorpora herramientas propias de analítica, píxeles publicitarios ni SDK de publicidad. No se venden datos personales ni se utilizan los ajustes locales del cubo para crear perfiles publicitarios.</p>

      <h2>4. Cuentas, cookies y autenticación</h2>
      <p>El simulador no exige crear una cuenta ni iniciar sesión para jugar. El código fuente incluye infraestructura técnica de autenticación (Better Auth), pero la interfaz actual no presenta un formulario de registro o acceso. Si una ruta o integración de autenticación llegara a utilizarse, ese flujo podría procesar identificadores de cuenta, datos recibidos del proveedor de identidad y cookies de sesión según la configuración activa. Antes de ofrecer el inicio de sesión como función de usuario, esta política deberá detallar los proveedores, finalidades, datos tratados y plazos correspondientes.</p>

      <h2>5. Finalidades y conservación</h2>
      <ul>
        <li>Guardar preferencias y progreso en el dispositivo para que el juego recuerde la configuración elegida.</li>
        <li>Permitir que los proveedores de infraestructura entreguen el sitio, mantengan su disponibilidad y atiendan necesidades técnicas y de seguridad.</li>
        <li>Responder los mensajes que envíes voluntariamente al correo de contacto.</li>
      </ul>
      <p>Los datos locales permanecen en tu navegador hasta que los elimines o el propio navegador los borre. Los registros técnicos de proveedores externos se conservan conforme a sus propias políticas y condiciones; Nettiss Software no establece ni controla los plazos internos de esos proveedores. Los correos se conservan durante el tiempo razonablemente necesario para atender la consulta y cumplir obligaciones aplicables.</p>

      <h2>6. Transferencias internacionales</h2>
      <p>Los proveedores de alojamiento y tipografías pueden operar infraestructura fuera de Paraguay. Por ello, las solicitudes técnicas dirigidas a Vercel o Google pueden implicar tratamiento internacional de datos de conexión. Consulta sus avisos oficiales para conocer sus prácticas, ubicaciones y mecanismos aplicables. El simulador no transfiere deliberadamente a esos proveedores el historial de movimientos guardado en tu almacenamiento local.</p>

      <h2>7. Tus opciones y derechos</h2>
      <p>Puedes controlar el almacenamiento local desde Configuración y desde tu navegador. Para solicitar información sobre datos personales que pudieran haberse recibido a través de un mensaje de contacto, o pedir su rectificación o eliminación cuando corresponda, escribe a <a href="mailto:nettisssoftware@gmail.com">nettisssoftware@gmail.com</a>. Describe tu solicitud y evita incluir contraseñas o información sensible.</p>
      <p>La <a href="https://www.bacn.gov.py/leyesparaguayas/9580/constitucion-nacional" target="_blank" rel="noreferrer">Constitución de la República del Paraguay</a> reconoce el derecho a la intimidad (artículo 33) y la garantía de hábeas data (artículo 135). La <a href="https://www.bacn.gov.py/leyes-paraguayas/12924/ley-n-7593-2025-de-proteccion-de-datos-personales-en-la-republica-del-paraguay" target="_blank" rel="noreferrer">Ley N.º 7593/2025 de Protección de Datos Personales</a> establece un marco integral, pero su artículo 57 dispone que entrará en vigor una vez transcurridos 24 meses desde su publicación oficial. El portal legislativo registra su publicación el 27 de noviembre de 2025; por tanto, a la fecha de esta política todavía no ha transcurrido ese plazo. Esta política se revisará conforme se acerque su entrada en vigor y se dicten sus normas reglamentarias.</p>
      <p>El Reglamento General de Protección de Datos de la Unión Europea (RGPD) puede resultar aplicable a responsables establecidos fuera de la Unión cuando se cumplan los supuestos territoriales del artículo 3, por ejemplo, ofrecer servicios a personas que se encuentran en la UE o supervisar su comportamiento allí. La mera accesibilidad del sitio desde Europa no determina por sí sola su aplicación. Consulta el <a href="https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/" target="_blank" rel="noreferrer">texto oficial del RGPD</a>.</p>

      <h2>8. Menores de edad</h2>
      <p>El juego no solicita deliberadamente datos personales de menores ni ofrece un registro infantil. Si una persona responsable considera que un menor ha enviado datos personales por correo, puede comunicarse para solicitar su revisión o eliminación cuando corresponda.</p>

      <h2>9. Cambios en esta política</h2>
      <p>Esta política puede modificarse cuando cambien las funciones del juego, los proveedores o las normas aplicables. La fecha de actualización se mostrará al comienzo de esta página. Los cambios importantes se reflejarán en esta misma dirección.</p>

      <div className="legal-note">Esta información describe la implementación revisada del proyecto a la fecha indicada. No constituye asesoramiento jurídico ni una certificación de cumplimiento legal. Si se incorporan cuentas, analítica, publicidad, pagos o sincronización en la nube, será necesario revisar y ampliar esta política.</div>
    </LegalPage>
  );
}
