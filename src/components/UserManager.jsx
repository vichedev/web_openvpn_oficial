// ============================================================================
//  UserManager — usuarios de UN MISMO servidor OpenVPN.
//
//  Todos los usuarios de la lista se conectan al mismo servidor del MikroTik:
//  comparten CA, perfil PPP, pool y puerto. Lo unico propio de cada uno es su
//  certificado (firmado por esa CA) y su /ppp secret.
// ============================================================================
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sanitizeName, isCleanName } from "../utils/rosSafe";
import { checkPassword, generatePassword } from "../utils/password";
import { certNameFor } from "../utils/mikrotikGenerator";
import { Field, TextInput, PasswordField, Callout, CopyableValue } from "./ui/FormBits";

const UserManager = ({ users, names, onAdd, onUpdate, onRemove, onRevoke }) => {
  const [draft, setDraft] = useState({ name: "", password: "" });
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);

  const cleanName = sanitizeName(draft.name);
  const pwCheck = checkPassword(draft.password);
  const nameWillChange = draft.name && !isCleanName(draft.name);
  const duplicate =
    cleanName && users.some((u) => u.name.toLowerCase() === cleanName.toLowerCase());

  const submit = (e) => {
    e.preventDefault();
    setError("");
    if (!cleanName) return setError("Escribe un nombre de usuario.");
    if (duplicate) return setError(`Ya existe un usuario "${cleanName}" en este servidor.`);
    if (pwCheck.error) return setError(pwCheck.error);

    const res = onAdd({ name: cleanName, password: draft.password });
    if (!res?.ok) return setError(res?.error || "No se pudo anadir el usuario.");
    setDraft({ name: "", password: "" });
  };

  return (
    <div className="glass glass-topline rounded-3xl p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          👥 Usuarios de este servidor
          <span className="text-sm font-bold px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300">
            {users.length}
          </span>
        </h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Anade tantos usuarios como necesites: <strong>todos se conectan al mismo servidor</strong>{" "}
        y al mismo puerto, cada uno con su propio certificado y su contrasena.
      </p>

      {/* --- Alta de usuario --- */}
      <form
        onSubmit={submit}
        className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-white/5 p-5 mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field
            label="Nombre del usuario"
            hint={
              nameWillChange
                ? `Se guardara como "${cleanName}" (sin espacios ni acentos).`
                : "Sin espacios. Es el usuario con el que se conecta (ej. usuario01)."
            }
            error={duplicate ? `Ya existe "${cleanName}" en este servidor.` : null}
          >
            <TextInput
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Ej: usuario01"
              invalid={Boolean(duplicate)}
            />
          </Field>
          <PasswordField
            label="Contrasena del usuario"
            value={draft.password}
            onChange={(v) => setDraft((d) => ({ ...d, password: v }))}
            hint="Autentica al usuario y cifra su llave privada. Minimo 8 caracteres."
          />
        </div>

        {error && (
          <p className="mt-3 text-sm font-semibold text-rose-600 dark:text-rose-400">⚠ {error}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all"
          >
            ➕ Anadir usuario
          </button>
          <button
            type="button"
            onClick={() =>
              setDraft({
                name: draft.name || `usuario${String(users.length + 1).padStart(2, "0")}`,
                password: generatePassword(16),
              })
            }
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 hover:bg-sky-500/20 transition-colors"
          >
            ⚡ Rellenar automaticamente
          </button>
        </div>
      </form>

      {/* --- Lista de usuarios --- */}
      {users.length === 0 ? (
        <Callout tone="amber" icon="👤" title="Aun no hay usuarios">
          Anade al menos uno para que el script cree sus certificados. Puedes anadir mas en
          cualquier momento sin tocar el servidor ni a los usuarios ya creados.
        </Callout>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {users.map((u) => {
              const cert = certNameFor(names, u.name);
              const check = checkPassword(u.password || "");
              return (
                <motion.li
                  key={u.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-white/5 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-white truncate">
                          {u.name}
                        </span>
                        {u.deployed ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                            ✓ script generado
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            pendiente
                          </span>
                        )}
                        {check.error && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300">
                            ⚠ contrasena no valida
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 break-all">
                        Archivos en Files: <code>{cert}.crt</code> · <code>{cert}.key</code>
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Contrasena:</span>
                        <CopyableValue value={u.password} secret />
                      </div>

                      {editingId === u.id && (
                        <div className="mt-3 max-w-md">
                          <PasswordField
                            label="Nueva contrasena"
                            value={u.password}
                            onChange={(v) => onUpdate(u.id, { password: v, deployed: false })}
                            hint="Al cambiarla hay que volver a generar el script y el .ovpn de este usuario."
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingId(editingId === u.id ? null : u.id)}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-sky-500/15 transition-colors"
                      >
                        {editingId === u.id ? "Cerrar" : "✏️ Clave"}
                      </button>
                      {u.deployed && (
                        <button
                          type="button"
                          onClick={() => onRevoke(u)}
                          title="Generar el script que corta el acceso de este usuario en el router"
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 transition-colors"
                        >
                          🚫 Revocar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemove(u)}
                        title="Quitar de esta lista (no toca el router)"
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 transition-colors"
                      >
                        🗑️ Quitar
                      </button>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
};

export default UserManager;
