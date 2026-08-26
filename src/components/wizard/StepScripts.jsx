// ============================================================================
//  Paso 3 — Scripts para el MikroTik.
//
//  Cuatro artefactos, cada uno con su momento:
//    · Servidor + usuarios : la primera vez, o si cambio la configuracion.
//    · Anadir usuarios     : altas posteriores, sin tocar el servidor.
//    · Comprobar la VPN    : diagnostico de solo lectura.
//    · Revocar             : cortar el acceso de alguien.
// ============================================================================
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { exportedFilesFor } from "../../utils/mikrotikGenerator";
import { useVpnConfig } from "../../hooks/useVpnConfig";
import WizardLayout from "./WizardLayout";
import { STEPS } from "./steps";
import SiteToSiteForm from "../SiteToSiteForm";
import { ScriptBox, Callout } from "../ui/FormBits";

const StepScripts = () => {
  const {
    session,
    users,
    names,
    fullScript,
    addScript,
    diagnosticScript,
    buildRevokeScript,
    pendingUsers,
    markServerDeployed,
    markUsersDeployed,
  } = useVpnConfig();

  const [params, setParams] = useSearchParams();
  const revocarParam = params.get("revocar");
  const [tab, setTab] = useState(revocarParam ? "revoke" : session.serverDeployed ? "add" : "full");
  const [revokeTarget, setRevokeTarget] = useState(revocarParam ?? "");

  // Si se llega desde el paso de usuarios con ?revocar=nombre, abrir esa pestana.
  useEffect(() => {
    if (revocarParam) {
      setTab("revoke");
      setRevokeTarget(revocarParam);
    }
  }, [revocarParam]);

  const TABS = [
    { id: "full", label: "Servidor + usuarios", hint: `${users.length} usuario(s)` },
    { id: "add", label: "Anadir usuarios", hint: `${pendingUsers.length} pendiente(s)` },
    { id: "check", label: "Comprobar la VPN", hint: "solo lectura" },
    { id: "revoke", label: "Revocar acceso", hint: "cortar a un usuario" },
  ];

  /** Al descargar/copiar el script de instalacion, la sesion pasa a "aplicado". */
  const markApplied = () => {
    markServerDeployed();
    markUsersDeployed(users.map((u) => u.id));
  };

  const fileList = users.map((u) => exportedFilesFor(names, u.name));

  return (
    <WizardLayout
      current="scripts"
      title="Aplica los scripts en el router"
      description="Descarga el .rsc, subelo a Files e importalo desde la terminal."
      prev={STEPS[1]}
      next={STEPS[3]}
    >
      {/* Selector de script */}
      <nav className="glass rounded-2xl p-1.5 grid grid-cols-2 lg:grid-cols-4 gap-1.5">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                if (t.id !== "revoke" && revocarParam) setParams({});
              }}
              className={`rounded-xl px-3 py-2.5 text-left transition-colors ${
                active ? "bg-sky-500/15 ring-1 ring-sky-400/50" : "hover:bg-slate-500/5"
              }`}
            >
              <span
                className={`block text-sm font-bold ${
                  active ? "text-sky-700 dark:text-sky-300" : "text-slate-700 dark:text-slate-200"
                }`}
              >
                {t.label}
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">{t.hint}</span>
            </button>
          );
        })}
      </nav>

      {tab === "full" && (
        <div onClickCapture={markApplied}>
          <ScriptBox
            title="Servidor + usuarios"
            subtitle="Monta el servidor OpenVPN y da de alta a todos los usuarios. Es reejecutable: la infraestructura solo se crea la primera vez."
            script={fullScript}
            fileName={`servidor-openvpn_${names.vpn}.rsc`}
          />
        </div>
      )}

      {tab === "add" &&
        (pendingUsers.length > 0 ? (
          <div onClickCapture={markApplied}>
            <ScriptBox
              title={`Anadir ${pendingUsers.length} usuario(s)`}
              subtitle="Reutiliza la CA y el perfil que ya existen. No toca el servidor ni a los usuarios que ya funcionan: quien este conectado no se entera."
              script={addScript}
              fileName={`anadir-usuarios_${names.vpn}.rsc`}
              tone="emerald"
            />
          </div>
        ) : (
          <Callout tone="blue" icon="✅" title="No hay usuarios pendientes">
            Todos los usuarios de la lista ya se incluyeron en un script. Si anades uno nuevo en el
            paso anterior, aparecera aqui.
          </Callout>
        ))}

      {tab === "check" && (
        <ScriptBox
          title="Comprobar la VPN"
          subtitle="Solo lee: no cambia nada del router. Revisa certificados, pool, perfil, servidor, usuarios, sesiones, firewall y NAT, y escribe un informe. Ejecutalo con un cliente conectado."
          script={diagnosticScript}
          fileName={`diagnostico_${names.vpn}.rsc`}
          tone="emerald"
        />
      )}

      {tab === "revoke" && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Usuario a revocar
            </label>
            <select
              value={revokeTarget}
              onChange={(e) => setRevokeTarget(e.target.value)}
              className="input-vpn max-w-sm"
            >
              <option value="">— elige un usuario —</option>
              {users.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {revokeTarget ? (
            <>
              <Callout tone="rose" icon="🚫" title="Esto corta el acceso en el router">
                Borra su <code>/ppp secret</code>, cierra su sesion activa y elimina su
                certificado. El <code>.ovpn</code> que ya tenga esa persona dejara de autenticar.
              </Callout>
              <ScriptBox
                title={`Revocar a ${revokeTarget}`}
                subtitle="El servidor y el resto de usuarios siguen funcionando."
                script={buildRevokeScript([{ name: revokeTarget }])}
                fileName={`revocar_${revokeTarget}.rsc`}
                tone="rose"
              />
            </>
          ) : (
            <Callout tone="blue" icon="ℹ️" title="Elige a quien revocar">
              Selecciona un usuario para generar el script que le corta el acceso.
            </Callout>
          )}
        </div>
      )}

      {/* Instrucciones de aplicacion */}
      {tab !== "check" && tab !== "revoke" && (
        <Callout tone="amber" icon="📁" title="Como aplicarlo">
          <ol className="space-y-2 list-decimal list-inside">
            <li>Descarga el <code>.rsc</code> y subelo a <strong>Files</strong> en WinBox/WebFig.</li>
            <li>
              En <strong>New Terminal</strong>:
              <pre className="mt-1 bg-amber-100 dark:bg-amber-950/50 rounded px-3 py-2 text-xs overflow-x-auto">
                <code>
                  /import file-name=
                  {tab === "full"
                    ? `servidor-openvpn_${names.vpn}.rsc`
                    : `anadir-usuarios_${names.vpn}.rsc`}
                </code>
              </pre>
              Importar es mas fiable que pegar: el script lleva bloques <code>:if</code>.
            </li>
            <li>Espera al firmado de certificados (1-3 min por usuario en routers pequenos).</li>
            <li>
              En <strong>Files</strong> descarga <code>{names.ca}.crt</code> y, de cada usuario, su
              par:
              <ul className="mt-1.5 ml-4 space-y-0.5 text-xs">
                {fileList.map((f) => (
                  <li key={f.cert}>
                    <code>{f.cert}</code> · <code>{f.key}</code>
                  </li>
                ))}
              </ul>
            </li>
          </ol>
        </Callout>
      )}

      {/* Site-to-site: es configuracion del router, por eso vive en este paso */}
      {users.length > 0 && (
        <details className="glass rounded-2xl p-5">
          <summary className="cursor-pointer font-bold text-slate-800 dark:text-white">
            Enlazar otro MikroTik (site-to-site)
            <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
              opcional — conecta una sucursal como un usuario mas
            </span>
          </summary>
          <div className="mt-5">
            <SiteToSiteForm />
          </div>
        </details>
      )}
    </WizardLayout>
  );
};

export default StepScripts;
