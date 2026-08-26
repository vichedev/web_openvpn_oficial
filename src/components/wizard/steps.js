// Definicion de los pasos del asistente y su estado.
// Vive fuera de WizardLayout.jsx para que ese archivo solo exporte componentes
// (requisito de react-refresh para el recarga en caliente).
import { useVpnConfig } from "../../hooks/useVpnConfig";

export const STEPS = [
  { id: "servidor", n: 1, label: "Servidor", hint: "Datos del MikroTik" },
  { id: "usuarios", n: 2, label: "Usuarios", hint: "Quien se conectara" },
  { id: "scripts", n: 3, label: "Scripts", hint: "Aplicar en el router" },
  { id: "perfiles", n: 4, label: "Perfiles", hint: "Archivos .ovpn" },
];

/** Que pasos estan completos, a partir de la sesion. */
export function useStepState() {
  const { serverOk, usersOk, users, session } = useVpnConfig();
  return {
    servidor: serverOk,
    usuarios: usersOk && users.length > 0,
    scripts: Boolean(session.serverDeployed),
    perfiles: Boolean(session.profilesGenerated),
  };
}
