// ============================================================================
//  ClientForm — genera los .ovpn de TODOS los usuarios del servidor de una vez.
//
//  Se sueltan todos los archivos juntos (el ca.crt y el par de cada usuario),
//  se reparten solos por nombre (certMatcher) y se descargan los perfiles en un
//  ZIP, o uno suelto desde su fila.
//
//  La version de RouterOS viene de la sesion (se elige en el paso 1 y se puede
//  ajustar en la barra de contexto): manda sobre el protocolo (v6 solo TCP) y
//  sobre los algoritmos que el servidor tiene habilitados.
// ============================================================================
import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  generateOvpnFile,
  parseCidr,
  clientAuthOptions,
  resolveNames,
  exportedFilesFor,
} from "../utils/mikrotikGenerator";
import { classifyFiles, buildUserStatus } from "../utils/certMatcher";
import { createZip } from "../utils/zip";
import { buildHandoffFiles } from "../utils/handoff";
import { useSession } from "../context/SessionContext";
import {
  Field,
  TextInput,
  SelectField,
  Toggle,
  Callout,
  CopyButton,
  CopyableValue,
} from "./ui/FormBits";

const CIPHERS_V7 = [
  { value: "AES-256-CBC", label: "AES-256-CBC (recomendado)" },
  { value: "AES-192-CBC", label: "AES-192-CBC" },
  { value: "AES-128-CBC", label: "AES-128-CBC" },
  { value: "AES-256-GCM", label: "AES-256-GCM (falla en RouterOS 7.17+)" },
  { value: "AES-128-GCM", label: "AES-128-GCM (falla en RouterOS 7.17+)" },
];
const CIPHERS_V6 = [
  { value: "AES-256-CBC", label: "AES-256-CBC (recomendado)" },
  { value: "AES-192-CBC", label: "AES-192-CBC" },
  { value: "AES-128-CBC", label: "AES-128-CBC" },
];

const AUTH_LABELS = {
  SHA256: "SHA-256 (recomendado)",
  SHA512: "SHA-512",
  SHA1: "SHA-1",
  MD5: "MD5 (debil)",
};

/** Descarga un Blob liberando despues el object URL. */
function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Cabecera de paso: numero, titulo, descripcion y estado a la derecha. */
const Step = ({ n, title, description, done, children }) => (
  <section className="glass glass-topline rounded-2xl overflow-hidden">
    <header className="flex items-start gap-4 px-5 md:px-6 py-5 border-b border-slate-200/70 dark:border-white/10">
      <span
        className={`shrink-0 grid place-items-center w-9 h-9 rounded-full text-sm font-bold transition-colors ${
          done
            ? "bg-emerald-500 text-white"
            : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
        }`}
        aria-hidden="true"
      >
        {done ? "✓" : n}
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 leading-snug">
            {description}
          </p>
        )}
      </div>
    </header>
    <div className="px-5 md:px-6 py-5">{children}</div>
  </section>
);

const ClientForm = () => {
  const { session, users, updateUser, updateSession } = useSession();
  const isV6 = session.routerVersion === "v6";
  const version = isV6 ? 6 : 7;

  const [assignment, setAssignment] = useState({ ca: null, byUser: {}, warnings: [] });
  const [generated, setGenerated] = useState({});
  const [dragging, setDragging] = useState(false);
  const [pwOpen, setPwOpen] = useState({});
  const [opts, setOpts] = useState({
    auth: "",
    cipher: "AES-256-CBC",
    embedCredentials: true,
    redirectGateway: true,
    routes: "",
    includeCredentials: true,
  });
  const inputRef = useRef(null);

  const names = useMemo(
    () => resolveNames({ routerVersion: session.routerVersion, vpnName: session.vpnName }),
    [session.routerVersion, session.vpnName]
  );

  // Si cambia la version, el algoritmo elegido puede dejar de estar habilitado
  // en el servidor: se cae al primero valido.
  const authValues = clientAuthOptions(session.routerVersion);
  const auth = authValues.includes(opts.auth) ? opts.auth : authValues[0];
  const cipherOptions = isV6 ? CIPHERS_V6 : CIPHERS_V7;
  const cipher = cipherOptions.some((c) => c.value === opts.cipher)
    ? opts.cipher
    : cipherOptions[0].value;

  const routeList = useMemo(
    () =>
      opts.routes
        .split(/[\s,;]+/)
        .map((r) => r.trim())
        .filter(Boolean),
    [opts.routes]
  );
  const badRoutes = routeList.filter((r) => !parseCidr(r).ok);

  const status = useMemo(
    () => buildUserStatus(users, assignment, Boolean(assignment.ca)),
    [users, assignment]
  );
  const readyUsers = status.filter((s) => s.ready);
  const generatedCount = Object.keys(generated).length;

  // --- Entrada de archivos -------------------------------------------------

  const ingest = async (fileList) => {
    const incoming = await Promise.all(
      Array.from(fileList).map(async (f) => ({ name: f.name, text: await f.text() }))
    );
    setAssignment((prev) => classifyFiles(incoming, names, users, prev));
    setGenerated({});
  };

  const clearAll = () => {
    setAssignment({ ca: null, byUser: {}, warnings: [] });
    setGenerated({});
    if (inputRef.current) inputRef.current.value = "";
  };

  // --- Generacion ----------------------------------------------------------

  const buildFor = (entry) =>
    generateOvpnFile({
      version,
      remote: session.publicIp,
      port: session.port,
      proto: isV6 ? "tcp" : session.protocol,
      username: entry.user.name,
      password: entry.user.password,
      auth,
      cipher,
      caCert: assignment.ca.text,
      clientCert: entry.cert.text,
      clientKey: entry.key.text,
      dns: session.dns,
      embedCredentials: opts.embedCredentials,
      redirectGateway: opts.redirectGateway,
      routes: routeList,
    });

  const generateAll = () => {
    if (!readyUsers.length) {
      Swal.fire({
        title: "Faltan archivos",
        text: "Sube el certificado CA y el .crt/.key de al menos un usuario.",
        icon: "warning",
        background: "#F9FAFB",
        confirmButtonColor: "#F59E0B",
      });
      return;
    }
    const output = {};
    for (const entry of readyUsers) output[entry.user.id] = buildFor(entry);
    setGenerated(output);
    updateSession({ profilesGenerated: true });
    Swal.fire({
      icon: "success",
      title: `${readyUsers.length} perfil${readyUsers.length === 1 ? "" : "es"} generado${
        readyUsers.length === 1 ? "" : "s"
      }`,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2400,
      timerProgressBar: true,
      background: "#F9FAFB",
    });
  };

  /** ZIP de entrega: los .ovpn + instrucciones + tabla de credenciales. */
  const downloadZip = () => {
    const files = buildHandoffFiles({
      generated,
      users,
      session,
      names,
      isV6,
      embedCredentials: opts.embedCredentials,
      includeCredentials: opts.includeCredentials,
    });
    saveBlob(createZip(files), `vpn_${names.vpn}_${Object.keys(generated).length}-usuarios.zip`);
  };

  const downloadOne = (entry) => {
    const content = generated[entry.user.id] ?? buildFor(entry);
    saveBlob(
      new Blob([content], { type: "application/x-openvpn-profile" }),
      `${entry.user.name}.ovpn`
    );
  };

  // --- Sin usuarios no hay nada que generar --------------------------------
  if (users.length === 0) {
    return (
      <div className="glass glass-topline rounded-2xl p-10 text-center">
        <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-2xl bg-sky-500/10 text-3xl">
          👥
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
          Todavia no hay usuarios
        </h2>
        <p className="text-slate-600 dark:text-slate-300 max-w-md mx-auto mb-6 text-sm leading-relaxed">
          Los perfiles <code>.ovpn</code> se generan para los usuarios dados de alta en el
          servidor: son los unicos que existen en el router con certificado y credenciales.
        </p>
        <Link
          to="/asistente/usuarios"
          className="inline-block bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/30 transition-all"
        >
          Crear el servidor y sus usuarios
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ================= PASO 1: certificados ================= */}
      <Step
        n={1}
        title="Sube los certificados"
        description={`Arrastra de golpe el ${names.ca}.crt y el .crt + .key de cada usuario. Se leen en tu navegador y no se envian a ningun sitio.`}
        done={readyUsers.length > 0}
      >
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files?.length) ingest(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${
            dragging
              ? "border-sky-400 bg-sky-500/10"
              : "border-slate-300 dark:border-white/20 hover:border-sky-400 hover:bg-sky-500/5"
          }`}
        >
          <div className="text-3xl mb-2">{dragging ? "📂" : "🗂️"}</div>
          <p className="font-semibold text-slate-700 dark:text-slate-200">
            Arrastra los archivos o haz clic para elegirlos
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Puedes soltarlos en varias tandas — se acumulan
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".crt,.cer,.pem,.key"
            className="hidden"
            onChange={(e) => e.target.files?.length && ingest(e.target.files)}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${
              assignment.ca
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
            }`}
          >
            {assignment.ca ? `✓ CA · ${assignment.ca.name}` : `Falta el CA (${names.ca}.crt)`}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {readyUsers.length} de {users.length} usuarios listos
          </span>
          {(assignment.ca || Object.keys(assignment.byUser).length > 0) && (
            <button
              type="button"
              onClick={clearAll}
              className="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-colors"
            >
              Empezar de nuevo
            </button>
          )}
        </div>

        {assignment.warnings.length > 0 && (
          <div className="mt-4">
            <Callout tone="amber" icon="⚠️" title="Avisos del reparto">
              <ul className="list-disc list-inside space-y-1">
                {assignment.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Callout>
          </div>
        )}
      </Step>

      {/* ================= PASO 2: usuarios ================= */}
      <Step
        n={2}
        title="Revisa los usuarios"
        description="Todos pertenecen al mismo servidor. Cada uno recibe su propio perfil."
        done={readyUsers.length === users.length && users.length > 0}
      >
        <ul className="divide-y divide-slate-200/70 dark:divide-white/10">
          {status.map((entry) => {
            const expected = exportedFilesFor(names, entry.user.name);
            const done = Boolean(generated[entry.user.id]);
            return (
              <li key={entry.user.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span
                    className={`shrink-0 w-2 h-2 rounded-full ${
                      entry.ready ? "bg-emerald-500" : "bg-amber-400"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-white">
                        {entry.user.name}
                      </span>
                      {done && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300">
                          generado
                        </span>
                      )}
                      {!entry.ready && (
                        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                          falta {entry.missing.join(", ")}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 break-all">
                      {entry.cert ? `✓ ${entry.cert.name}` : `esperando ${expected.cert}`}
                      {" · "}
                      {entry.key ? `✓ ${entry.key.name}` : `esperando ${expected.key}`}
                    </p>

                    {(!entry.user.password || pwOpen[entry.user.id]) && (
                      <div className="mt-3 max-w-sm">
                        <Field
                          label="Contrasena del usuario"
                          hint="No esta guardada en esta pestana. Autentica y descifra la llave."
                        >
                          <TextInput
                            type="text"
                            value={entry.user.password}
                            onChange={(e) => {
                              setPwOpen((o) => ({ ...o, [entry.user.id]: true }));
                              updateUser(entry.user.id, { password: e.target.value });
                            }}
                            placeholder={`Contrasena de ${entry.user.name}`}
                            invalid={!entry.user.password}
                          />
                        </Field>
                      </div>
                    )}
                  </div>

                  {entry.ready && (
                    <div className="flex items-center gap-2 shrink-0">
                      <CopyableValue value={entry.user.password} secret />
                      <button
                        type="button"
                        onClick={() => downloadOne(entry)}
                        className="px-3.5 py-2 rounded-lg text-sm font-semibold border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                      >
                        Descargar .ovpn
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Step>

      {/* ================= PASO 3: opciones y descarga ================= */}
      <Step
        n={3}
        title="Ajusta y descarga"
        description="Estas opciones se aplican a todos los perfiles por igual."
        done={generatedCount > 0}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SelectField
            label="Autenticacion (HMAC)"
            value={auth}
            onChange={(e) => setOpts((o) => ({ ...o, auth: e.target.value }))}
            options={authValues.map((v) => ({ value: v, label: AUTH_LABELS[v] ?? v }))}
            hint="Solo se ofrecen los algoritmos que el script habilita en tu version."
          />
          <SelectField
            label="Cifrado de los datos"
            value={cipher}
            onChange={(e) => setOpts((o) => ({ ...o, cipher: e.target.value }))}
            options={cipherOptions}
            hint="CBC es lo fiable: RouterOS 7.17+ falla con AES-*-GCM."
          />
        </div>

        <div className="mt-5 space-y-4">
          <Toggle
            checked={opts.embedCredentials}
            onChange={(v) => setOpts((o) => ({ ...o, embedCredentials: v }))}
            label="Incluir usuario y contrasena dentro de cada .ovpn"
            hint="Comodo, pero quien abra el archivo las vera. Desactivalo si vas a repartirlos por correo o mensajeria."
          />
          <Toggle
            checked={opts.redirectGateway}
            onChange={(v) => setOpts((o) => ({ ...o, redirectGateway: v }))}
            label="Enviar todo el trafico por la VPN"
            hint="Desactivado (tunel dividido): solo va por la VPN el trafico hacia las redes que indiques."
          />
          {!opts.redirectGateway && (
            <Field
              label="Redes accesibles por la VPN"
              hint="Separadas por coma. Ej: 192.168.88.0/24, 10.0.0.0/8"
              error={badRoutes.length ? `Redes no validas: ${badRoutes.join(", ")}` : null}
            >
              <TextInput
                type="text"
                value={opts.routes}
                onChange={(e) => setOpts((o) => ({ ...o, routes: e.target.value }))}
                placeholder="192.168.88.0/24"
                invalid={badRoutes.length > 0}
              />
            </Field>
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-slate-200/70 dark:border-white/10 flex flex-col sm:flex-row gap-3 items-center">
          <button
            type="button"
            onClick={generateAll}
            disabled={!readyUsers.length}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 px-7 rounded-xl shadow-lg shadow-sky-500/25 transition-all enabled:hover:-translate-y-0.5"
          >
            Generar {readyUsers.length || ""} perfil{readyUsers.length === 1 ? "" : "es"}
          </button>

          <AnimatePresence>
            {generatedCount > 1 && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                onClick={downloadZip}
                className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-7 rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5"
              >
                Descargar los {generatedCount} en un ZIP
              </motion.button>
            )}
          </AnimatePresence>

          {generatedCount > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 sm:ml-2">
              Cada persona necesita solo su archivo.
            </p>
          )}
        </div>

        {generatedCount > 0 && (
          <div className="mt-5">
            <Toggle
              checked={opts.includeCredentials}
              onChange={(v) => setOpts((o) => ({ ...o, includeCredentials: v }))}
              label="Incluir credenciales.csv en el ZIP"
              hint="Tabla con usuario y contrasena de cada persona. Util para el administrador; el ZIP completo no debe reenviarse a los usuarios."
            />
          </div>
        )}
      </Step>

      {/* ================= ENTREGA ================= */}
      {generatedCount > 0 && (
        <section className="glass glass-topline rounded-2xl overflow-hidden">
          <header className="px-5 md:px-6 py-5 border-b border-slate-200/70 dark:border-white/10">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              Entrega a los usuarios
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              A cada persona se le manda <strong>solo su .ovpn</strong>. Esta tabla es para ti.
            </p>
          </header>

          <div className="px-5 md:px-6 py-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200/70 dark:border-white/10">
                    <th className="pb-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">
                      Usuario
                    </th>
                    <th className="pb-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">
                      Contrasena
                      <span className="block text-[11px] font-normal text-slate-400 dark:text-slate-500">
                        tambien es su Private Key Password
                      </span>
                    </th>
                    <th className="pb-2 font-semibold text-slate-600 dark:text-slate-300">
                      Archivo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                  {status
                    .filter((e) => generated[e.user.id])
                    .map((e) => (
                      <tr key={e.user.id}>
                        <td className="py-2.5 pr-4">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800 dark:text-white">
                              {e.user.name}
                            </span>
                            <CopyButton value={e.user.name} compact title="Copiar usuario" />
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <CopyableValue value={e.user.password} secret />
                        </td>
                        <td className="py-2.5">
                          <button
                            type="button"
                            onClick={() => downloadOne(e)}
                            className="text-sky-600 dark:text-sky-400 font-semibold hover:underline"
                          >
                            {e.user.name}.ovpn
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Callout tone="blue" icon="🔑" title="Sobre la Private Key Password">
                Es la contrasena de <strong>cada usuario</strong>, no una clave comun: MikroTik
                exporta la llave privada de cada persona cifrada con la suya. La de un usuario no
                abre la llave de otro. Lo unico compartido es el certificado de la CA (
                <code>{names.ca}.crt</code>), que ya va dentro de cada <code>.ovpn</code>.
              </Callout>
              <Callout tone="amber" icon="🔒" title="Cuidado con el ZIP">
                Si incluyes <code>credenciales.csv</code>, el paquete lleva las contrasenas en
                texto plano. Guardalo tu y reparte a cada persona unicamente su archivo{" "}
                <code>.ovpn</code>.
              </Callout>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ClientForm;
