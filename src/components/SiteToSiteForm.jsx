// ============================================================================
//  SiteToSiteForm — conecta OTRO MikroTik como cliente del servidor VPN.
//  Genera el .rsc que importa los certificados y crea la interfaz ovpn-client.
//  (Antes esta funcion existia en el generador pero no estaba en la interfaz.)
// ============================================================================
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  generateClientRouterScript,
  clientAuthOptions,
  resolveNames,
  exportedFilesFor,
  parseCidr,
} from "../utils/mikrotikGenerator";
import { useSession } from "../context/SessionContext";
import { Field, TextInput, SelectField, Toggle, ScriptBox, Callout } from "./ui/FormBits";

const SiteToSiteForm = () => {
  const { session, users, selectedUser, selectUser } = useSession();
  const isV6 = session.routerVersion === "v6";
  const version = isV6 ? 6 : 7;

  const names = useMemo(
    () => resolveNames({ routerVersion: session.routerVersion, vpnName: session.vpnName }),
    [session.routerVersion, session.vpnName]
  );

  const [form, setForm] = useState({
    interfaceName: "ovpn-out",
    auth: clientAuthOptions(session.routerVersion)[0],
    cipher: "AES-256-CBC",
    addDefaultRoute: false,
    remoteNetworks: "",
  });
  const [show, setShow] = useState(false);

  const username = selectedUser?.name ?? "";
  const password = selectedUser?.password ?? "";
  const files = exportedFilesFor(names, username || "cliente1");

  const nets = form.remoteNetworks
    .split(/[\s,;]+/)
    .map((n) => n.trim())
    .filter(Boolean);
  const badNets = nets.filter((n) => !parseCidr(n).ok);

  const script = useMemo(
    () =>
      generateClientRouterScript({
        version,
        remote: session.publicIp,
        port: session.port,
        proto: isV6 ? "tcp" : session.protocol,
        username,
        password: password || "<CLAVE_DEL_USUARIO>",
        auth: form.auth,
        cipher: form.cipher,
        caFilename: files.ca,
        clientCertFilename: files.cert,
        clientKeyFilename: files.key,
        interfaceName: form.interfaceName,
        addDefaultRoute: form.addDefaultRoute,
        remoteNetworks: nets.filter((n) => parseCidr(n).ok),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, session.publicIp, session.port, session.protocol, isV6, username, password, JSON.stringify(form), JSON.stringify(nets)]
  );

  // Igual que en el .ovpn: solo se configuran usuarios que existen en el router.
  if (users.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass glass-topline rounded-3xl p-8 md:p-10 text-center"
      >
        <div className="text-5xl mb-4">🔗</div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          Necesitas un usuario para el enlace
        </h2>
        <p className="text-slate-600 dark:text-slate-300 max-w-xl mx-auto mb-6">
          El router remoto se conecta como un usuario mas del servidor. Crea uno dedicado (por
          ejemplo <code>sucursal-norte</code>) en el paso <strong>Servidor</strong>.
        </p>
        <Link
          to="/asistente/usuarios"
          className="inline-block bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-fuchsia-500/30 transition-all"
        >
          👥 Ir a crear el usuario
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="glass rounded-3xl overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-fuchsia-500 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-white/15 to-transparent -skew-x-12" />
          <h2 className="text-2xl font-bold text-white text-center relative z-10">
            🔗 Otro MikroTik como cliente (site-to-site)
          </h2>
          <p className="text-center text-violet-100 text-sm mt-1 relative z-10">
            Enlaza dos sucursales usando un usuario de este mismo servidor
          </p>
        </div>

        <div className="p-6 space-y-6">
          <Callout tone="blue" icon="ℹ️" title="Como funciona">
            El router remoto usa <strong>un usuario mas</strong> del servidor: mismos certificados,
            mismo puerto. Crea un usuario dedicado (ej. <code>sucursal-norte</code>) en el paso
            Servidor y selecciona aqui.
          </Callout>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SelectField
              label="Usuario para el router remoto"
              value={selectedUser?.id ?? ""}
              onChange={(e) => selectUser(e.target.value)}
              options={users.map((u) => ({ value: u.id, label: u.name }))}
              hint="Se usaran su certificado y sus credenciales."
            />

            <Field
              label="Nombre de la interfaz en el router remoto"
              hint="Como se llamara la interfaz ovpn-client alli."
            >
              <TextInput
                type="text"
                value={form.interfaceName}
                onChange={(e) => setForm((f) => ({ ...f, interfaceName: e.target.value }))}
                placeholder="ovpn-out"
              />
            </Field>

            <SelectField
              label="Autenticacion"
              value={form.auth}
              onChange={(e) => setForm((f) => ({ ...f, auth: e.target.value }))}
              options={clientAuthOptions(session.routerVersion).map((v) => ({
                value: v,
                label: v === "SHA256" ? "SHA-256 (recomendado)" : v,
              }))}
            />
            <SelectField
              label="Cifrado"
              value={form.cipher}
              onChange={(e) => setForm((f) => ({ ...f, cipher: e.target.value }))}
              options={[
                { value: "AES-256-CBC", label: "AES-256-CBC (recomendado)" },
                { value: "AES-192-CBC", label: "AES-192-CBC" },
                { value: "AES-128-CBC", label: "AES-128-CBC" },
              ]}
              hint="RouterOS anade el sufijo -cbc automaticamente en la v7."
            />
          </div>

          <div className="space-y-4">
            <Toggle
              checked={form.addDefaultRoute}
              onChange={(v) => setForm((f) => ({ ...f, addDefaultRoute: v }))}
              label="Enviar TODO el trafico del router remoto por la VPN"
              hint="Normalmente NO: en un enlace entre sucursales solo se rutean las redes internas. Activarlo saca toda la navegacion de la sucursal por el router central."
            />
            <Field
              label="Redes del lado central accesibles desde la sucursal"
              hint="Se crean rutas hacia ellas por el tunel. Separadas por coma. Ej: 192.168.88.0/24"
              error={badNets.length ? `Redes no validas: ${badNets.join(", ")}` : null}
            >
              <TextInput
                type="text"
                value={form.remoteNetworks}
                onChange={(e) => setForm((f) => ({ ...f, remoteNetworks: e.target.value }))}
                placeholder="192.168.88.0/24"
                invalid={badNets.length > 0}
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={() => setShow(true)}
            className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white py-3.5 px-6 rounded-xl font-bold shadow-lg shadow-fuchsia-500/30 transition-all"
          >
            🔗 Generar script del router cliente
          </button>
        </div>
      </div>

      {show && (
        <ScriptBox
          title="Script para el MikroTik remoto"
          subtitle={`Sube primero ${files.ca}, ${files.cert} y ${files.key} a Files del router remoto, y despues importa este script.`}
          script={script}
          fileName={`cliente-router_${username || "sucursal"}.rsc`}
          tone="sky"
        />
      )}
    </motion.div>
  );
};

export default SiteToSiteForm;
