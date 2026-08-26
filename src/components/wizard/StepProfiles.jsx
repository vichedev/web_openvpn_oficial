// ============================================================================
//  Paso 4 — Perfiles .ovpn de los usuarios.
// ============================================================================
import React from "react";
import { useVpnConfig } from "../../hooks/useVpnConfig";
import { clientAuthOptions } from "../../utils/mikrotikGenerator";
import WizardLayout from "./WizardLayout";
import { STEPS } from "./steps";
import ClientForm from "../ClientForm";

const StepProfiles = () => {
  const { session, isV6 } = useVpnConfig();
  const authPorDefecto = clientAuthOptions(session.routerVersion)[0];

  return (
    <WizardLayout
      current="perfiles"
      title="Genera los perfiles .ovpn"
      description="Suelta los certificados que descargaste del router: se reparten solos entre tus usuarios."
      prev={STEPS[2]}
    >
      {/* Que produce la version elegida: se ve antes de generar nada */}
      <div className="glass rounded-2xl px-5 py-3.5">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold">Cada perfil llevara:</span>{" "}
          <code className="px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-800/70">
            proto {isV6 ? "tcp" : session.protocol}
          </code>{" "}
          <code className="px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-800/70">
            auth {authPorDefecto}
          </code>{" "}
          {isV6 ? (
            <span>
              y un unico cifrado fijo — RouterOS 6 no negocia y el protocolo se fuerza a TCP.
            </span>
          ) : (
            <span>
              <code className="px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-800/70">
                tls-version-min 1.2
              </code>{" "}
              y lista de <code>data-ciphers</code> con respaldo.
            </span>
          )}{" "}
          <span className="text-slate-400 dark:text-slate-500">
            (definido por la version elegida en el paso 1)
          </span>
        </p>
      </div>

      <ClientForm />
    </WizardLayout>
  );
};

export default StepProfiles;
