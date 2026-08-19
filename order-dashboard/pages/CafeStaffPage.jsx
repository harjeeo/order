import { useEffect, useState } from "react";
import { PlusSignIcon, Delete02Icon, Cancel01Icon, ShieldUserIcon } from "hugeicons-react";
import {
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  toggleStaffActive,
  defaultPermissionsForRole,
  PERMISSION_MODULES,
  ROLES,
} from "../lib/mockApi";
import Avatar from "../components/Avatar";

function emptyForm() {
  return { name: "", role: ROLES[0], phone: "", email: "", permissions: defaultPermissionsForRole(ROLES[0]) };
}

export default function CafeStaffPage() {
  const [staff, setStaff] = useState([]);
  const [editing, setEditing] = useState(null); // "new" | staffId | null
  const [form, setForm] = useState(null);

  async function refresh() {
    setStaff(await getStaff());
  }

  useEffect(() => {
    refresh();
  }, []);

  function startCreate() {
    setEditing("new");
    setForm(emptyForm());
  }

  function startEdit(member) {
    setEditing(member._id);
    setForm({ ...member, permissions: { ...member.permissions } });
  }

  function cancelEdit() {
    setEditing(null);
    setForm(null);
  }

  function handleRoleChange(role) {
    setForm((f) => ({ ...f, role, permissions: defaultPermissionsForRole(role) }));
  }

  function togglePermission(module) {
    setForm((f) => ({ ...f, permissions: { ...f.permissions, [module]: !f.permissions[module] } }));
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    const payload = { name: form.name.trim(), role: form.role, phone: form.phone, email: form.email, permissions: form.permissions };
    if (editing === "new") {
      await createStaff(payload);
    } else {
      await updateStaff(editing, payload);
    }
    cancelEdit();
    refresh();
  }

  async function handleDelete(member) {
    await deleteStaff(member._id);
    if (editing === member._id) cancelEdit();
    refresh();
  }

  async function handleToggleActive(member) {
    await toggleStaffActive(member._id);
    refresh();
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Staff & Roles</h1>
            <p className="mt-1 text-sm text-(--color-text-muted)">Team members and module permissions.</p>
          </div>
          <button
            type="button"
            onClick={startCreate}
            className="flex items-center gap-1.5 rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-white"
          >
            <PlusSignIcon size={14} strokeWidth={1.8} />
            Add Staff
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-(--color-border)">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Phone</th>
                <th className="px-3 py-2 font-medium">Permissions</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr
                  key={member._id}
                  onClick={() => startEdit(member)}
                  className="cursor-pointer border-b border-(--color-border) last:border-0 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={member.name} size={24} />
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex w-fit items-center gap-1 rounded-full bg-(--color-accent)/10 px-2 py-0.5 text-xs font-medium text-(--color-accent)">
                      <ShieldUserIcon size={11} strokeWidth={1.8} />
                      {member.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-(--color-text-muted)">{member.phone || "-"}</td>
                  <td className="px-3 py-2 text-xs text-(--color-text-muted)">
                    {PERMISSION_MODULES.filter((m) => member.permissions[m]).join(", ") || "None"}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(member);
                      }}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        member.active
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-black/5 text-(--color-text-muted) dark:bg-white/10"
                      }`}
                    >
                      {member.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(member);
                      }}
                      className="text-(--color-text-muted)"
                    >
                      <Delete02Icon size={14} strokeWidth={1.8} />
                    </button>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                    No staff added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <div className="w-96 shrink-0 overflow-y-auto border-l border-(--color-border) p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{editing === "new" ? "Add Staff" : "Edit Staff"}</h2>
            <button type="button" onClick={cancelEdit} className="text-(--color-text-muted)">
              <Cancel01Icon size={16} strokeWidth={1.8} />
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Name"
              className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
            />
            <select
              value={form.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Phone"
              className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
            />
            <input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Email"
              className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>

          <div className="mt-4">
            <div className="text-xs font-medium text-(--color-text-muted)">Permissions</div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {PERMISSION_MODULES.map((m) => (
                <label
                  key={m}
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm ${
                    form.permissions[m] ? "border-(--color-accent) bg-(--color-accent)/10" : "border-(--color-border)"
                  }`}
                >
                  <input type="checkbox" checked={!!form.permissions[m]} onChange={() => togglePermission(m)} />
                  {m}
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="mt-5 w-full rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white"
          >
            {editing === "new" ? "Add Staff" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
