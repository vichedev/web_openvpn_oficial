import React, { createContext, useContext, useState, useEffect } from "react";

// ============================================================================
//  Sesión de configuración OpenVPN
//
//  Una "sesión" arranca cuando el usuario entra a la web. Los datos que
//  introduce al crear el SERVIDOR (IP pública, usuario, contraseña, puerto,
//  protocolo, versión) quedan guardados en la sesión y se autocompletan en la
//  pestaña del CLIENTE (.ovpn), para no tener que volver a teclearlos.
//
//  La sesión se marca como "credenciales creadas" cuando se genera el script
//  del servidor. A partir de ahí el usuario puede terminar la sesión y empezar
//  una nueva (se limpian todos los campos).
//
//  Persistencia: sessionStorage -> los datos sobreviven a la navegación entre
//  pestañas y a recargar la página, pero se borran al cerrar la pestaña.
// ============================================================================

const SessionContext = createContext();

const STORAGE_KEY = "ovpn-session";

const emptySession = {
  active: true,
  publicIp: "", // IP pública del servidor  -> remote del cliente
  clientName: "", // usuario VPN              -> username del cliente
  clientPassword: "", // contraseña del usuario   -> password del cliente
  port: "1194",
  protocol: "udp",
  routerVersion: "v7", // v6 | v7
  // Red de la VPN (solo se usa en el servidor, pero la guardamos para que el
  // formulario sobreviva a la navegación y "terminar sesión" lo limpie todo).
  vpnNetwork: "10.10.10.0/24",
  localAddress: "10.10.10.1",
  poolRange: "10.10.10.10-10.10.10.254",
  dns: "8.8.8.8,1.1.1.1",
  credentialsCreated: false, // true tras generar el script del servidor
  startedAt: null,
};

const freshSession = () => ({ ...emptySession, startedAt: Date.now() });

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession debe usarse dentro de un SessionProvider");
  }
  return context;
};

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return { ...emptySession, ...JSON.parse(saved) };
    } catch {
      /* sessionStorage no disponible o JSON corrupto: arrancamos limpio */
    }
    return freshSession();
  });

  // Persistimos cualquier cambio en la sesión.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* ignorar errores de almacenamiento (modo privado, etc.) */
    }
  }, [session]);

  // Actualiza uno o varios campos de la sesión.
  const updateSession = (patch) => setSession((s) => ({ ...s, ...patch }));

  // Marca que los certificados/credenciales ya se generaron.
  const markCredentialsCreated = () =>
    setSession((s) => ({ ...s, credentialsCreated: true }));

  // Termina la sesión actual y arranca una nueva, en blanco.
  const endSession = () => setSession(freshSession());

  return (
    <SessionContext.Provider
      value={{ session, updateSession, markCredentialsCreated, endSession }}
    >
      {children}
    </SessionContext.Provider>
  );
};
