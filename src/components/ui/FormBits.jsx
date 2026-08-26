// ============================================================================
//  Piezas de formulario compartidas por el generador de servidor y el de
//  clientes. Antes estaban duplicadas en Mikrotik6Form y Mikrotik7Form.
// ============================================================================
import React, { useState } from "react";
import { generatePassword, checkPassword } from "../../utils/password";

/** Etiqueta + control + pista + error de validacion. */
export const Field = ({ label, hint, error, children, className = "" }) => (
  <div className={className}>
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
      {label}
    </label>
    {children}
    {error ? (
      <p className="mt-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 leading-snug">
        ⚠ {error}
      </p>
    ) : hint ? (
      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-snug">{hint}</p>
    ) : null}
  </div>
);

export const TextInput = ({ invalid, className = "", ...props }) => (
  <input
    {...props}
    className={`input-vpn ${invalid ? "input-invalid" : ""} ${className}`}
  />
);

export const SelectField = ({ label, hint, error, options, ...props }) => (
  <Field label={label} hint={hint} error={error}>
    <select {...props} className="input-vpn">
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </Field>
);

export const FileField = ({ label, hint, error, accept, onChange, inputRef, required }) => (
  <Field label={label} hint={hint} error={error}>
    <input
      type="file"
      ref={inputRef}
      accept={accept}
      onChange={onChange}
      required={required}
      className="input-vpn cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-500/15 file:text-sky-700 dark:file:text-sky-300 file:cursor-pointer hover:file:bg-sky-500/25"
    />
  </Field>
);

/** Interruptor accesible para opciones si/no. */
export const Toggle = ({ checked, onChange, label, hint }) => (
  <label className="flex items-start gap-3 cursor-pointer select-none">
    <span className="relative mt-0.5 shrink-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <span className="block w-11 h-6 rounded-full bg-slate-300 dark:bg-slate-600 peer-checked:bg-sky-500 transition-colors" />
      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
    </span>
    <span>
      <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      {hint && (
        <span className="block text-xs text-slate-500 dark:text-slate-400 leading-snug">{hint}</span>
      )}
    </span>
  </label>
);

const STRENGTH_COLORS = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-emerald-500",
];

/**
 * Campo de contrasena con: ocultar/mostrar, generador seguro y medidor de
 * robustez. La contrasena de un usuario VPN cifra ademas su llave privada, asi
 * que conviene que sea fuerte.
 */
export const PasswordField = ({ label = "Contrasena", value, onChange, hint, error, id }) => {
  const [visible, setVisible] = useState(false);
  const check = checkPassword(value || "");
  const showMeter = Boolean(value);

  return (
    <Field label={label} hint={hint} error={error || (value ? check.error : null)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <TextInput
            id={id}
            type={visible ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Minimo 8 caracteres"
            autoComplete="new-password"
            className="pr-11"
            invalid={Boolean(error || (value && check.error))}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            title={visible ? "Ocultar" : "Mostrar"}
            aria-label={visible ? "Ocultar contrasena" : "Mostrar contrasena"}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-lg opacity-70 hover:opacity-100"
          >
            {visible ? "🙈" : "👁️"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(generatePassword(16));
            setVisible(true);
          }}
          title="Generar una contrasena aleatoria segura"
          className="px-3 rounded-xl text-sm font-semibold bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 hover:bg-sky-500/20 transition-colors whitespace-nowrap"
        >
          🎲 Generar
        </button>
      </div>

      {showMeter && !check.error && (
        <div className="mt-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < check.score ? STRENGTH_COLORS[check.score] : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Robustez: <strong>{check.label}</strong>
            {check.warnings.length > 0 && ` · ${check.warnings[0]}`}
          </p>
        </div>
      )}
    </Field>
  );
};

/**
 * Bloque de script generado: titulo, copiar, descargar y el codigo.
 * Copiar usa el portapapeles y cae a selection manual si el navegador lo niega.
 */
export const ScriptBox = ({ title, subtitle, script, fileName, tone = "sky", children }) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError(true);
    }
  };

  const download = () => {
    const blob = new Blob([script], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Liberamos el objeto: si no, el blob queda en memoria hasta recargar.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const tones = {
    sky: "from-sky-500 to-cyan-500 shadow-cyan-500/30",
    emerald: "from-emerald-500 to-teal-500 shadow-emerald-500/30",
    rose: "from-rose-500 to-red-500 shadow-rose-500/30",
  };

  return (
    <div className="glass glass-topline rounded-3xl p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">{title}</h3>
          {subtitle && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">{subtitle}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={copy}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${
              copied ? "bg-emerald-500" : "bg-slate-600 hover:bg-slate-700 hover:-translate-y-0.5"
            }`}
          >
            {copied ? "✓ Copiado" : "📋 Copiar"}
          </button>
          <button
            onClick={download}
            className={`bg-gradient-to-r ${tones[tone]} text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg transition-all hover:-translate-y-0.5`}
          >
            💾 Descargar .rsc
          </button>
        </div>
      </div>

      {copyError && (
        <p className="mb-3 text-xs text-amber-600 dark:text-amber-400">
          Tu navegador bloqueo el portapapeles. Selecciona el texto y copialo con Ctrl+C.
        </p>
      )}

      {children}

      <pre className="code-block p-5 overflow-x-auto text-xs md:text-sm leading-relaxed whitespace-pre max-h-[28rem]">
        {script}
      </pre>
    </div>
  );
};

/** Aviso en color, para notas y advertencias. */
export const Callout = ({ tone = "blue", icon, title, children }) => {
  const tones = {
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300",
    amber:
      "bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-700/60 text-amber-800 dark:text-amber-300",
    emerald:
      "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-600 text-emerald-800 dark:text-emerald-200",
    rose: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700 text-rose-800 dark:text-rose-300",
  };
  return (
    <div className={`rounded-2xl border p-4 md:p-5 ${tones[tone]}`}>
      {title && (
        <h4 className="font-bold mb-1.5 flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          {title}
        </h4>
      )}
      <div className="text-sm leading-relaxed opacity-95">{children}</div>
    </div>
  );
};

/**
 * Boton de copiar con confirmacion en el sitio.
 *
 * El feedback va tambien por aria-live: quien use lector de pantalla necesita
 * enterarse de que se copio, igual que quien ve el cambio de color.
 */
export const CopyButton = ({ value, label, title, className = "", compact = false }) => {
  const [state, setState] = useState("idle"); // idle | ok | error

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState("ok");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 1800);
  };

  const tones = {
    idle: "text-slate-600 dark:text-slate-300 hover:bg-sky-500/15 border-slate-200 dark:border-white/10",
    ok: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/40",
    error: "text-rose-700 dark:text-rose-300 bg-rose-500/15 border-rose-500/40",
  };
  const texto = state === "ok" ? "Copiado" : state === "error" ? "No se pudo" : label;

  return (
    <button
      type="button"
      onClick={copy}
      title={title ?? (label ? undefined : "Copiar")}
      aria-label={title ?? label ?? "Copiar"}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-semibold transition-colors ${
        compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"
      } ${tones[state]} ${className}`}
    >
      <span aria-hidden="true">{state === "ok" ? "✓" : state === "error" ? "✕" : "📋"}</span>
      {texto && <span>{texto}</span>}
      <span className="sr-only" role="status" aria-live="polite">
        {state === "ok" ? "Copiado al portapapeles" : state === "error" ? "No se pudo copiar" : ""}
      </span>
    </button>
  );
};

/** Valor monoespaciado con boton de copiar y opcion de ocultar (contrasenas). */
export const CopyableValue = ({ value, secret = false, empty = "(no guardada)" }) => {
  const [visible, setVisible] = useState(!secret);
  if (!value) return <span className="text-xs text-slate-400 dark:text-slate-500">{empty}</span>;

  return (
    <span className="inline-flex items-center gap-1.5">
      <code className="px-2 py-1 rounded bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 text-xs font-mono">
        {visible ? value : "•".repeat(Math.min(14, value.length))}
      </code>
      {secret && (
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar" : "Mostrar"}
          title={visible ? "Ocultar" : "Mostrar"}
          className="px-1.5 py-1 rounded-lg text-xs opacity-70 hover:opacity-100 hover:bg-sky-500/15 transition-all"
        >
          {visible ? "🙈" : "👁️"}
        </button>
      )}
      <CopyButton value={value} compact title="Copiar al portapapeles" />
    </span>
  );
};
