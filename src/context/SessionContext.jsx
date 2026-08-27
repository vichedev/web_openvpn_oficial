import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { sanitizeName } from "../utils/rosSafe";
import { VPN_DEFAULTS } from "../utils/mikrotikGenerator";

// ============================================================================
//  Sesion de configuracion OpenVPN
//
//  MODELO: 1 SERVIDOR + N USUARIOS.
//  La sesion guarda los datos del SERVIDOR (uno solo: IP, puerto, protocolo,
//  red, DNS, version) y una LISTA de usuarios. Todos los usuarios pertenecen a
//  ese mismo servidor: comparten CA, perfil PPP, pool y puerto, y cada uno tiene
//  su propio certificado y sus propias credenciales.
//
//  Persistencia: sessionStorage -> sobrevive a navegar y recargar, se borra al
//  cerrar la pestana. Las contrasenas solo se guardan si el usuario lo permite
//  (persistPasswords); si lo desactiva viven unicamente en memoria.
// ============================================================================

const SessionContext = createContext();

const STORAGE_KEY = "ovpn-session";
const SCHEMA_VERSION = 2;

const emptySession = {
  schema: SCHEMA_VERSION,
  active: true,

  // --- Datos del SERVIDOR (uno por sesion) ---
  vpnName: VPN_DEFAULTS.vpnName,
  publicIp: "",
  port: VPN_DEFAULTS.port,
  protocol: VPN_DEFAULTS.proto,
  routerVersion: "v7", // v6 | v7-legacy | v7
  vpnNetwork: VPN_DEFAULTS.network,
  localAddress: VPN_DEFAULTS.localAddress,
  poolRange: VPN_DEFAULTS.poolRange,
  dns: VPN_DEFAULTS.dns,
  natMode: VPN_DEFAULTS.natMode, // srcnat | masquerade | none
  keySize: VPN_DEFAULTS.keySize,
  validUntil: "", // YYYY-MM-DD; vacio = hoy + 10 anios

  // --- USUARIOS de ese servidor ---
  users: [], // [{ id, name, password, deployed, createdAt }]
  selectedUserId: null,

  // --- Estado del flujo ---
  serverDeployed: false, // true cuando ya se genero el script del servidor
  profilesGenerated: false, // true cuando ya se genero algun .ovpn
  persistPasswords: true,
  startedAt: null,
};

const freshSession = () => ({ ...emptySession, startedAt: Date.now() });

const newId = () =>
  `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Normaliza un valor guardado: si falta o no es del tipo esperado, se queda el
 * valor por defecto. Importante porque importProfile() acepta cualquier JSON
 * que el usuario arrastre, y un null colandose en publicIp reventaria el
 * formulario al llamar a .trim().
 */
function pickString(value, fallback) {
  return typeof value === "string" ? value : fallback;
}

/** Sanea la lista de usuarios venga como venga en el archivo. */
function normalizeUsers(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((u) => u && typeof u === "object")
    .map((u) => ({
      id: pickString(u.id, newId()),
      name: sanitizeName(pickString(u.name, "")),
      password: pickString(u.password, ""),
      deployed: Boolean(u.deployed),
      createdAt: typeof u.createdAt === "number" ? u.createdAt : Date.now(),
    }))
    .filter((u) => u.name);
}

/**
 * Migra sesiones guardadas con el modelo antiguo (un unico clientName /
 * clientPassword) al modelo de lista de usuarios, y sanea el resto de campos.
 */
function migrate(saved) {
  if (!saved || typeof saved !== "object") return freshSession();

  // Los campos de texto se validan uno a uno: nunca aceptamos null/objetos.
  const base = {
    ...emptySession,
    ...saved,
    schema: SCHEMA_VERSION,
    vpnName: pickString(saved.vpnName, emptySession.vpnName),
    publicIp: pickString(saved.publicIp, ""),
    port: pickString(String(saved.port ?? ""), emptySession.port) || emptySession.port,
    protocol: saved.protocol === "tcp" ? "tcp" : "udp",
    routerVersion: ["v6", "v7-legacy", "v7"].includes(saved.routerVersion)
      ? saved.routerVersion
      : "v7",
    vpnNetwork: pickString(saved.vpnNetwork, emptySession.vpnNetwork),
    localAddress: pickString(saved.localAddress, emptySession.localAddress),
    poolRange: pickString(saved.poolRange, emptySession.poolRange),
    dns: pickString(saved.dns, emptySession.dns),
    // "auto" era un modo anterior: las sesiones guardadas con el pasan a srcnat.
    natMode: ["masquerade", "srcnat", "none"].includes(saved.natMode)
      ? saved.natMode
      : "srcnat",
    keySize: ["1024", "2048", "4096"].includes(String(saved.keySize))
      ? String(saved.keySize)
      : emptySession.keySize,
    validUntil: pickString(saved.validUntil, ""),
    persistPasswords: saved.persistPasswords !== false,
  };

  if (saved.schema === SCHEMA_VERSION) {
    const users = normalizeUsers(saved.users);
    return {
      ...base,
      users,
      selectedUserId: users.some((u) => u.id === saved.selectedUserId)
        ? saved.selectedUserId
        : (users[0]?.id ?? null),
      serverDeployed: Boolean(saved.serverDeployed),
      profilesGenerated: Boolean(saved.profilesGenerated),
    };
  }

  // Modelo antiguo: un unico cliente -> primer usuario de la lista.
  const users = normalizeUsers(
    saved.clientName
      ? [
          {
            name: saved.clientName,
            password: saved.clientPassword,
            deployed: Boolean(saved.credentialsCreated),
            createdAt: saved.startedAt,
          },
        ]
      : []
  );
  return {
    ...base,
    users,
    selectedUserId: users[0]?.id ?? null,
    serverDeployed: Boolean(saved.credentialsCreated),
  };
}

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
      if (saved) return migrate(JSON.parse(saved));
    } catch {
      /* sessionStorage no disponible o JSON corrupto: arrancamos limpio */
    }
    return freshSession();
  });

  // Persistimos cualquier cambio. Si el usuario desactivo el guardado de
  // contrasenas, se escriben vacias (siguen vivas en memoria hasta recargar).
  useEffect(() => {
    try {
      const toSave = session.persistPasswords
        ? session
        : { ...session, users: session.users.map((u) => ({ ...u, password: "" })) };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      /* ignorar errores de almacenamiento (modo privado, cuota, etc.) */
    }
  }, [session]);

  const updateSession = useCallback((patch) => setSession((s) => ({ ...s, ...patch })), []);

  // --- Usuarios ------------------------------------------------------------

  /** Anade un usuario al servidor. Devuelve un error si el nombre se repite. */
  const addUser = useCallback(({ name, password }) => {
    const clean = sanitizeName(name);
    if (!clean) return { ok: false, error: "El nombre de usuario no es valido." };
    let result = { ok: true, id: null };
    setSession((s) => {
      if (s.users.some((u) => u.name.toLowerCase() === clean.toLowerCase())) {
        result = { ok: false, error: `Ya existe un usuario llamado "${clean}" en este servidor.` };
        return s;
      }
      const user = { id: newId(), name: clean, password, deployed: false, createdAt: Date.now() };
      result = { ok: true, id: user.id };
      return { ...s, users: [...s.users, user], selectedUserId: s.selectedUserId ?? user.id };
    });
    return result;
  }, []);

  const updateUser = useCallback((id, patch) => {
    setSession((s) => ({
      ...s,
      users: s.users.map((u) =>
        u.id === id ? { ...u, ...patch, ...(patch.name ? { name: sanitizeName(patch.name, u.name) } : {}) } : u
      ),
    }));
  }, []);

  const removeUser = useCallback((id) => {
    setSession((s) => {
      const users = s.users.filter((u) => u.id !== id);
      return {
        ...s,
        users,
        selectedUserId: s.selectedUserId === id ? (users[0]?.id ?? null) : s.selectedUserId,
      };
    });
  }, []);

  const selectUser = useCallback((id) => setSession((s) => ({ ...s, selectedUserId: id })), []);

  /** Marca usuarios como ya desplegados en el router (script generado). */
  const markUsersDeployed = useCallback((ids) => {
    const set = new Set(ids);
    setSession((s) => ({
      ...s,
      users: s.users.map((u) => (set.has(u.id) ? { ...u, deployed: true } : u)),
    }));
  }, []);

  const markServerDeployed = useCallback(
    () => setSession((s) => ({ ...s, serverDeployed: true })),
    []
  );

  const endSession = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nada que limpiar */
    }
    setSession(freshSession());
  }, []);

  // --- Perfil exportable ---------------------------------------------------

  /**
   * Serializa la configuracion para guardarla en un archivo .json y poder
   * retomarla otro dia (o en otro equipo). Las contrasenas se incluyen solo si
   * se pide explicitamente.
   */
  const exportProfile = useCallback(
    (includePasswords = false) => {
      const { ...data } = session;
      return JSON.stringify(
        {
          ...data,
          users: data.users.map((u) => ({ ...u, password: includePasswords ? u.password : "" })),
          exportedAt: new Date().toISOString(),
          app: "web-openvpn-maat",
        },
        null,
        2
      );
    },
    [session]
  );

  /** Carga un perfil previamente exportado. */
  const importProfile = useCallback((json) => {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || typeof parsed !== "object") throw new Error("formato");
      setSession(migrate({ ...parsed, startedAt: Date.now() }));
      return { ok: true };
    } catch {
      return { ok: false, error: "El archivo no es un perfil valido de Web OpenVPN." };
    }
  }, []);

  const selectedUser = useMemo(
    () => session.users.find((u) => u.id === session.selectedUserId) ?? session.users[0] ?? null,
    [session.users, session.selectedUserId]
  );

  const value = useMemo(
    () => ({
      session,
      users: session.users,
      selectedUser,
      updateSession,
      addUser,
      updateUser,
      removeUser,
      selectUser,
      markUsersDeployed,
      markServerDeployed,
      endSession,
      exportProfile,
      importProfile,
    }),
    [
      session,
      selectedUser,
      updateSession,
      addUser,
      updateUser,
      removeUser,
      selectUser,
      markUsersDeployed,
      markServerDeployed,
      endSession,
      exportProfile,
      importProfile,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};
