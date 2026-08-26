// ============================================================================
//  Paso 2 — Usuarios del servidor.
// ============================================================================
import React from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { useVpnConfig } from "../../hooks/useVpnConfig";
import WizardLayout from "./WizardLayout";
import { STEPS } from "./steps";
import UserManager from "../UserManager";
import { Callout } from "../ui/FormBits";

const StepUsers = () => {
  const { users, names, addUser, updateUser, removeUser, usersOk, userErrors, pendingUsers } =
    useVpnConfig();
  const navigate = useNavigate();

  const handleRemove = async (user) => {
    const res = await Swal.fire({
      title: `Quitar a "${user.name}"?`,
      html:
        "<p>Se quita de esta lista. <strong>No toca el router:</strong> si ya lo creaste alli, " +
        "usa <em>Revocar</em> para cortarle el acceso de verdad.</p>",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Quitar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#E11D48",
      background: "#F9FAFB",
      customClass: { popup: "rounded-2xl shadow-xl" },
    });
    if (res.isConfirmed) removeUser(user.id);
  };

  // Revocar vive en el paso de scripts: alli es donde se ve el .rsc resultante.
  const handleRevoke = (user) => navigate(`/asistente/scripts?revocar=${encodeURIComponent(user.name)}`);

  return (
    <WizardLayout
      current="usuarios"
      title="Anade los usuarios"
      description="Cada persona que se conectara a la VPN. Todos comparten el mismo servidor."
      prev={STEPS[0]}
      next={STEPS[2]}
      nextDisabled={!usersOk}
    >
      <UserManager
        users={users}
        names={names}
        onAdd={addUser}
        onUpdate={updateUser}
        onRemove={handleRemove}
        onRevoke={handleRevoke}
      />

      {users.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total", value: users.length },
            { label: "Ya en el router", value: users.filter((u) => u.deployed).length },
            { label: "Pendientes", value: pendingUsers.length },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {s.label}
              </p>
              <p className="text-2xl font-extrabold text-slate-800 dark:text-white tabular-nums">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {!usersOk && userErrors.users && (
        <Callout tone="amber" icon="⚠️" title="Antes de continuar">
          {userErrors.users}
        </Callout>
      )}
    </WizardLayout>
  );
};

export default StepUsers;
