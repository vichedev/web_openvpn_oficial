// ============================================================================
//  WizardLayout — el armazon del asistente.
//
//  Cuatro pasos en orden: Servidor -> Usuarios -> Scripts -> Perfiles.
//  A la izquierda, la navegacion con el estado de cada paso; a la derecha, el
//  contenido. En movil la navegacion pasa a una fila superior.
//
//  Cada paso es una URL propia (/asistente/servidor, /asistente/usuarios...),
//  asi el boton "atras" del navegador y los enlaces directos funcionan.
// ============================================================================
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useVpnConfig } from "../../hooks/useVpnConfig";
import { STEPS, useStepState } from "./steps";


const StepIcon = ({ n, done, active }) => (
  <span
    aria-hidden="true"
    className={`grid place-items-center w-8 h-8 rounded-full text-sm font-bold shrink-0 transition-colors ${
      done
        ? "bg-emerald-500 text-white"
        : active
          ? "bg-sky-500 text-white"
          : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
    }`}
  >
    {done ? "✓" : n}
  </span>
);

/** Resumen permanente de la configuracion, visible en todos los pasos. */
const SummaryCard = () => {
  const { session, users, names, isV6, net } = useVpnConfig();
  const proto = isV6 ? "TCP" : session.protocol.toUpperCase();

  const filas = [
    { label: "Servidor", value: session.publicIp || "—", warn: !session.publicIp },
    { label: "Puerto", value: `${session.port}/${proto}` },
    { label: "Red VPN", value: net.valid ? net.network : session.vpnNetwork },
    { label: "Usuarios", value: users.length, warn: users.length === 0 },
    { label: "CA", value: `${names.ca}.crt` },
  ];

  return (
    <div className="glass rounded-2xl p-4">
      <h3 className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
        Resumen
      </h3>
      <dl className="space-y-2">
        {filas.map((f) => (
          <div key={f.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-slate-500 dark:text-slate-400">{f.label}</dt>
            <dd
              className={`text-xs font-semibold text-right truncate tabular-nums ${
                f.warn
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-700 dark:text-slate-200"
              }`}
              title={String(f.value)}
            >
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

const WizardLayout = ({ current, title, description, children, next, prev, nextDisabled }) => {
  const state = useStepState();
  const navigate = useNavigate();
  const doneCount = Object.values(state).filter(Boolean).length;

  return (
    <div className="page-bg pt-24 pb-20">
      <div className="aurora">
        <span className="aurora-blob b1" />
        <span className="aurora-blob b2" />
        <span className="aurora-blob b3" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Encabezado del asistente */}
        <div className="max-w-6xl mx-auto mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Asistente de VPN</span>
            <h1 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-white">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 text-slate-600 dark:text-slate-300 max-w-2xl">{description}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Progreso
            </p>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-white tabular-nums">
              {doneCount}
              <span className="text-slate-400 dark:text-slate-500 text-lg">/{STEPS.length}</span>
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[15rem_1fr] gap-6">
          {/* ---------- Navegacion de pasos ---------- */}
          <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
            <nav aria-label="Pasos del asistente" className="glass rounded-2xl p-2">
              <ol className="flex lg:flex-col gap-1 overflow-x-auto">
                {STEPS.map((s) => {
                  const done = state[s.id];
                  const active = current === s.id;
                  return (
                    <li key={s.id} className="flex-1 lg:flex-none">
                      <NavLink
                        to={`/asistente/${s.id}`}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                          active
                            ? "bg-sky-500/10 ring-1 ring-sky-400/50"
                            : "hover:bg-slate-500/5"
                        }`}
                        aria-current={active ? "step" : undefined}
                      >
                        <StepIcon n={s.n} done={done} active={active} />
                        <span className="min-w-0 hidden sm:block">
                          <span
                            className={`block text-sm font-bold leading-tight ${
                              active
                                ? "text-sky-700 dark:text-sky-300"
                                : "text-slate-700 dark:text-slate-200"
                            }`}
                          >
                            {s.label}
                          </span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {s.hint}
                          </span>
                        </span>
                      </NavLink>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <div className="hidden lg:block">
              <SummaryCard />
            </div>
          </aside>

          {/* ---------- Contenido del paso ---------- */}
          <div className="min-w-0">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-5"
            >
              {children}
            </motion.div>

            {/* ---------- Navegacion inferior ---------- */}
            {(prev || next) && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                {prev ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/asistente/${prev.id}`)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 transition-colors"
                  >
                    ← {prev.label}
                  </button>
                ) : (
                  <span />
                )}

                {next && (
                  <button
                    type="button"
                    onClick={() => navigate(`/asistente/${next.id}`)}
                    disabled={nextDisabled}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 shadow-lg shadow-cyan-500/25 transition-all enabled:hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={nextDisabled ? "Completa este paso para continuar" : undefined}
                  >
                    {next.label} →
                  </button>
                )}
              </div>
            )}

            <div className="lg:hidden mt-6">
              <SummaryCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WizardLayout;
