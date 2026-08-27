// ============================================================================
//  Paso 1 — Datos del servidor OpenVPN del MikroTik.
// ============================================================================
import React, { useState, useRef } from "react";
import Swal from "sweetalert2";
import {
  deriveVpnNetwork,
  randomPrivateNetwork,
  randomVpnPort,
} from "../../utils/mikrotikGenerator";
import { useVpnConfig, addDaysISO, VALID_PRESETS } from "../../hooks/useVpnConfig";
import WizardLayout from "./WizardLayout";
import { STEPS } from "./steps";
import { Field, TextInput, SelectField, Toggle, Callout } from "../ui/FormBits";

const VERSIONS = [
  {
    id: "v6",
    label: "RouterOS 6",
    note: "Solo TCP · cifrados clasicos",
    desc: "Un unico servidor OVPN con 'set enabled=yes'.",
  },
  {
    id: "v7-legacy",
    label: "RouterOS 7.0 – 7.16",
    note: "UDP/TCP · incluye 7.15 y 7.16",
    desc: "Servidor unico con 'set enabled=yes' e incluyendo protocol=.",
  },
  {
    id: "v7",
    label: "RouterOS 7.17+",
    note: "UDP/TCP · multi-instancia",
    desc: "Varios servidores VPN en el mismo router ('add name=…').",
  },
];

const StepServer = () => {
  const {
    session,
    updateSession,
    names,
    net,
    isV6,
    serverErrors,
    serverOk,
    warnings,
    effectiveValidUntil,
    validDays,
    exportProfile,
    importProfile,
  } = useVpnConfig();

  const [touched, setTouched] = useState(false);
  const importRef = useRef(null);
  // Los errores no se muestran hasta que el usuario edita algo: entrar al paso
  // y ver todo en rojo es hostil.
  const update = (patch) => {
    setTouched(true);
    updateSession(patch);
  };
  const err = (k) => (touched ? serverErrors[k] : undefined);

  const version = VERSIONS.find((v) => v.id === session.routerVersion) ?? VERSIONS[2];

  const handleNetworkChange = (value) => {
    setTouched(true);
    const d = deriveVpnNetwork(value);
    if (d.valid) {
      updateSession({ vpnNetwork: value, localAddress: d.localAddress, poolRange: d.poolRange });
    } else {
      updateSession({ vpnNetwork: value });
    }
  };

  /** Sortea una red privada libre de conflictos y recalcula gateway y pool. */
  const sortearRed = () => {
    setTouched(true);
    const cidr = randomPrivateNetwork();
    const d = deriveVpnNetwork(cidr);
    updateSession({ vpnNetwork: cidr, localAddress: d.localAddress, poolRange: d.poolRange });
  };

  const sortearPuerto = () => update({ port: randomVpnPort() });

  const handleExport = async () => {
    const res = await Swal.fire({
      title: "Guardar perfil",
      html: "<p>Descarga un <code>.json</code> con la configuracion y los usuarios, para retomarla mas adelante.</p>",
      icon: "question",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Sin contrasenas",
      denyButtonText: "Con contrasenas",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#0EA5E9",
      denyButtonColor: "#F59E0B",
      background: "#F9FAFB",
      customClass: { popup: "rounded-2xl shadow-xl" },
    });
    if (res.isDismissed) return;
    const blob = new Blob([exportProfile(res.isDenied)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `perfil-vpn_${names.vpn}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = importProfile(await file.text());
    e.target.value = "";
    Swal.fire({
      title: res.ok ? "Perfil cargado" : "Archivo no valido",
      text: res.ok ? undefined : res.error,
      icon: res.ok ? "success" : "error",
      toast: res.ok,
      position: res.ok ? "top-end" : "center",
      showConfirmButton: !res.ok,
      timer: res.ok ? 2000 : undefined,
      background: "#F9FAFB",
    });
  };

  return (
    <WizardLayout
      current="servidor"
      title="Configura el servidor"
      description="Se define una sola vez. Todos los usuarios se conectaran a el."
      next={STEPS[1]}
      nextDisabled={!serverOk}
    >
      {/* Version de RouterOS */}
      <section className="glass glass-topline rounded-2xl p-5 md:p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
          Version de tu RouterOS
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Compruebala en Winbox con <code>/system resource print</code>. Elegir mal la rama da
          error de sintaxis al importar.
        </p>
        <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {VERSIONS.map((v) => {
            const active = session.routerVersion === v.id;
            return (
              <button
                key={v.id}
                role="radio"
                aria-checked={active}
                onClick={() => updateSession({ routerVersion: v.id })}
                className={`text-left rounded-xl border px-4 py-3 transition-all ${
                  active
                    ? "border-sky-400 bg-sky-500/10 shadow-sm"
                    : "border-slate-200 dark:border-white/10 hover:border-sky-300 hover:bg-sky-500/5"
                }`}
              >
                <span
                  className={`block text-sm font-bold ${
                    active ? "text-sky-700 dark:text-sky-300" : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {v.label}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {v.note}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{version.desc}</p>
      </section>

      {/* Datos basicos */}
      <section className="glass glass-topline rounded-2xl p-5 md:p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
          Como llegan los clientes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field
            label="IP publica o dominio"
            hint="Por donde se llega al MikroTik desde Internet."
            error={err("publicIp")}
            className="md:col-span-1"
          >
            <TextInput
              type="text"
              value={session.publicIp}
              onChange={(e) => update({ publicIp: e.target.value })}
              placeholder="181.188.203.190"
              invalid={Boolean(err("publicIp"))}
            />
          </Field>
          <Field
            label="Puerto"
            hint="1194 es el estandar, pero vale cualquiera. Uno alto recibe menos escaneos automaticos."
            error={err("port")}
          >
            <div className="flex gap-2">
              <TextInput
                type="number"
                value={session.port}
                onChange={(e) => update({ port: e.target.value })}
                placeholder="1194"
                min="1"
                max="65535"
                invalid={Boolean(err("port"))}
              />
              <button
                type="button"
                onClick={sortearPuerto}
                title="Sortear un puerto libre (10000-49151), evitando los de gestion del router"
                className="shrink-0 px-3 rounded-xl text-sm font-semibold bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 hover:bg-sky-500/20 transition-colors"
              >
                🎲
              </button>
            </div>
          </Field>
          <Field
            label="Protocolo"
            hint={isV6 ? "RouterOS 6 solo admite TCP." : "UDP es mas rapido (recomendado)."}
          >
            {isV6 ? (
              <div className="input-vpn opacity-70">TCP (unico en RouterOS 6)</div>
            ) : (
              <select
                value={session.protocol}
                onChange={(e) => update({ protocol: e.target.value })}
                className="input-vpn"
              >
                <option value="udp">UDP (recomendado)</option>
                <option value="tcp">TCP</option>
              </select>
            )}
          </Field>
        </div>
      </section>

      {/* Red de la VPN */}
      <section className="glass glass-topline rounded-2xl p-5 md:p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Red de la VPN</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Rango privado que se repartira entre los usuarios. No debe chocar con la LAN del
          MikroTik.
          {net.valid && (
            <span className="ml-1">
              Gateway <code>{net.localAddress}</code>, pool <code>{net.poolRange}</code> —{" "}
              <strong>{net.hosts}</strong> clientes simultaneos.
            </span>
          )}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field
            label="Red VPN (CIDR)"
            hint="El gateway y el pool se calculan solos. El sorteo evita las redes tipicas de casa (192.168.0/1/88), que chocarian con la LAN del usuario."
            error={err("vpnNetwork")}
          >
            <div className="flex gap-2">
              <TextInput
                type="text"
                value={session.vpnNetwork}
                onChange={(e) => handleNetworkChange(e.target.value)}
                placeholder="10.10.10.0/24"
                invalid={Boolean(err("vpnNetwork"))}
              />
              <button
                type="button"
                onClick={sortearRed}
                title="Sortear una red privada /24 sin conflictos"
                className="shrink-0 px-3 rounded-xl text-sm font-semibold bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 hover:bg-sky-500/20 transition-colors"
              >
                🎲
              </button>
            </div>
          </Field>
          <Field
            label="DNS para los clientes"
            hint="Se escriben en el .ovpn: MikroTik no los envia solo."
            error={err("dns")}
          >
            <TextInput
              type="text"
              value={session.dns}
              onChange={(e) => update({ dns: e.target.value })}
              placeholder="8.8.8.8,1.1.1.1"
              invalid={Boolean(err("dns"))}
            />
          </Field>
        </div>
      </section>

      {/* Caducidad */}
      <section className="glass glass-topline rounded-2xl p-5 md:p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
          Caducidad de los certificados
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Cuando caducan, la VPN deja de funcionar. Util para accesos temporales.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <Field label="Caduca el" error={err("validUntil")} className="sm:w-56">
            <TextInput
              type="date"
              value={effectiveValidUntil}
              min={addDaysISO(1)}
              onChange={(e) => update({ validUntil: e.target.value })}
              invalid={Boolean(err("validUntil"))}
            />
          </Field>
          <div className="flex flex-wrap gap-2 pb-1">
            {VALID_PRESETS.map((p) => {
              const presetDate = addDaysISO(p.days);
              const active = effectiveValidUntil === presetDate;
              return (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => updateSession({ validUntil: presetDate })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    active
                      ? "bg-sky-500 border-sky-500 text-white"
                      : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-sky-500/10"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          {validDays >= 1 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 pb-2">
              {validDays} dias (<code>days-valid={validDays}</code>)
            </p>
          )}
        </div>
      </section>

      {/* Ajustes avanzados */}
      <details className="glass rounded-2xl p-5 md:p-6">
        <summary className="cursor-pointer font-bold text-slate-800 dark:text-white">
          Ajustes avanzados
          <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
            nombre, gateway, pool, NAT y cifrado — los valores por defecto sirven
          </span>
        </summary>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field
            label="Nombre de la VPN"
            hint={
              names.singleton
                ? "RouterOS 6/7.0-7.16 solo admite un servidor: se usan nombres fijos."
                : `Nombra los objetos del router: ${names.ca}, ${names.srv}, ${names.server}.`
            }
          >
            <TextInput
              type="text"
              value={session.vpnName}
              onChange={(e) => updateSession({ vpnName: e.target.value })}
              placeholder="oficina"
              disabled={names.singleton}
            />
          </Field>
          <Field
            label="Gateway VPN (local-address)"
            hint="IP del MikroTik dentro de la VPN. Fuera del pool."
            error={err("localAddress")}
          >
            <TextInput
              type="text"
              value={session.localAddress}
              onChange={(e) => update({ localAddress: e.target.value })}
              placeholder="10.10.10.1"
              invalid={Boolean(err("localAddress"))}
            />
          </Field>
          <Field
            label="Pool de IPs"
            hint="Rango que se reparte entre los usuarios conectados."
            error={err("poolRange")}
          >
            <TextInput
              type="text"
              value={session.poolRange}
              onChange={(e) => update({ poolRange: e.target.value })}
              placeholder="10.10.10.10-10.10.10.254"
              invalid={Boolean(err("poolRange"))}
            />
          </Field>
          <SelectField
            label="Salida a Internet (NAT)"
            value={session.natMode}
            onChange={(e) => updateSession({ natMode: e.target.value })}
            options={[
              { value: "auto", label: "Automatico (recomendado)" },
              { value: "masquerade", label: "Masquerade" },
              { value: "srcnat", label: "src-nat a la IP publica" },
              { value: "none", label: "No crear regla" },
            ]}
            hint="Automatico: crea la regla en la posicion 0 y decide la accion en el router — src-nat si la IP publica es suya (vale aunque este en 'lo'), masquerade si no lo es."
          />
          <SelectField
            label="Tamano de clave"
            value={session.keySize}
            onChange={(e) => updateSession({ keySize: e.target.value })}
            options={[
              { value: "2048", label: "2048 bits (recomendado)" },
              { value: "4096", label: "4096 bits (firma lenta)" },
            ]}
            hint="En routers pequenos, 4096 puede tardar varios minutos."
          />
          <div className="md:col-span-2">
            <Toggle
              checked={session.persistPasswords}
              onChange={(v) => updateSession({ persistPasswords: v })}
              label="Recordar las contrasenas en esta pestana"
              hint="Si lo desactivas viven solo en memoria: al recargar se pierden."
            />
          </div>
        </div>
      </details>

      {warnings.length > 0 && (
        <Callout tone="amber" icon="⚠️" title="Ten en cuenta">
          <ul className="list-disc list-inside space-y-1">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Callout>
      )}

      {!serverOk && touched && (
        <Callout tone="rose" icon="⛔" title="Faltan datos">
          <ul className="list-disc list-inside space-y-1">
            {Object.values(serverErrors).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Callout>
      )}

      {/* Guardar / cargar perfil */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
        <button onClick={handleExport} className="text-sky-600 dark:text-sky-400 hover:underline">
          Guardar perfil (.json)
        </button>
        <button
          onClick={() => importRef.current?.click()}
          className="text-sky-600 dark:text-sky-400 hover:underline"
        >
          Cargar perfil
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImport}
          className="hidden"
        />
        <span className="text-slate-400 dark:text-slate-500 font-normal">
          Todo se genera en tu navegador: nada sale de este equipo.
        </span>
      </div>
    </WizardLayout>
  );
};

export default StepServer;
