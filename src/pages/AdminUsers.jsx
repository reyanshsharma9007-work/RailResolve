import React, { useState, useEffect, useCallback } from 'react';
import useAuth from '../hooks/useAuth';
import Modal from '../components/common/Modal';
import { adminService } from '../services/adminService';
import { ROLES } from '../constants/roles';

import Icon from '../components/common/Icon';
/**
 * Staff & user management. This is the missing half of the admin story:
 * OFFICER and SENIOR_AUTHORITY accounts are never self-registered (the public
 * /api/auth/register endpoint is PASSENGER-only), so they have to be created
 * here. Everything maps to a route in admin.routes.js — nothing is invented.
 *
 * An OFFICER must have a department: that department is what scopes their
 * complaint queue AND what makes them appear in the admin's assignment
 * dropdown, because assignComplaintToOfficer rejects a department mismatch.
 */

const CREATABLE_ROLES = [ROLES.OFFICER, ROLES.SENIOR_AUTHORITY, ROLES.ADMIN];

const ROLE_LABELS = {
  [ROLES.PASSENGER]: 'Passenger',
  [ROLES.OFFICER]: 'Officer',
  [ROLES.SENIOR_AUTHORITY]: 'Senior Authority',
  [ROLES.ADMIN]: 'Admin',
};

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: ROLES.OFFICER,
  departmentCode: '',
};

const AdminUsers = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [roleFilter, setRoleFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [banner, setBanner] = useState(null);

  // Role change modal
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editDepartmentCode, setEditDepartmentCode] = useState('');
  const [editError, setEditError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [usersRes, deptRes] = await Promise.all([
        adminService.getUsers({ limit: 100 }),
        adminService.getDepartments(),
      ]);
      if (usersRes.success) setUsers(usersRes.data.users || []);
      if (deptRes.success) setDepartments(deptRes.data.departments || []);
    } catch (err) {
      setLoadError(err.message || 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeDepartments = departments.filter((d) => d.isActive !== false);

  const visibleUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    }
    return true;
  });

  const officerCount = users.filter((u) => u.role === ROLES.OFFICER && u.isActive).length;
  const authorityCount = users.filter((u) => u.role === ROLES.SENIOR_AUTHORITY && u.isActive).length;

  const openCreate = () => {
    setForm({ ...emptyForm, departmentCode: activeDepartments[0]?.code || '' });
    setFormError(null);
    setCreateOpen(true);
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (form.role === ROLES.OFFICER && !form.departmentCode) {
      setFormError('An officer must be assigned to a department.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        phone: form.phone.trim() || undefined,
      };
      if (form.role === ROLES.OFFICER) payload.departmentCode = form.departmentCode;

      const res = await adminService.createUser(payload);
      if (res.success) {
        setCreateOpen(false);
        setBanner(
          `${ROLE_LABELS[form.role]} account created for ${payload.email}. Share the password with them — they sign in on the normal login screen.`
        );
        setForm(emptyForm);
        await fetchData();
      }
    } catch (err) {
      setFormError(err.message || 'Could not create the account.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setEditRole(u.role);
    setEditDepartmentCode(u.departmentId?.code || activeDepartments[0]?.code || '');
    setEditError(null);
  };

  const handleRoleChange = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    try {
      setSaving(true);
      const payload = { role: editRole };
      if (editRole === ROLES.OFFICER) payload.departmentCode = editDepartmentCode;
      await adminService.updateUserRole(editingUser._id, payload);
      setEditingUser(null);
      setBanner('Role updated. The user must sign out and back in for their new console to load.');
      await fetchData();
    } catch (err) {
      setEditError(err.message || 'Could not update the role.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    try {
      if (u.isActive) {
        await adminService.deactivateUser(u._id);
      } else {
        await adminService.activateUser(u._id);
      }
      await fetchData();
    } catch (err) {
      setBanner(err.message || 'Could not change the account status.');
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-16 text-center">
        <Icon name="refresh" className="animate-spin text-4xl text-primary mb-4" />
        <p className="text-on-surface dark:text-white font-bold text-sm">Loading staff directory...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-margin py-8">
      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total accounts', value: users.length, icon: 'group', tone: 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950' },
          { label: 'Active officers', value: officerCount, icon: 'engineering', tone: 'text-primary bg-orange-50 dark:bg-orange-950' },
          { label: 'Senior authorities', value: authorityCount, icon: 'gavel', tone: 'text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950' },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-surface-container-lowest dark:bg-slate-900 p-5 rounded-2xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase">{card.label}</span>
              <span className={`p-2 rounded-xl ${card.tone}`}>
                <Icon name={card.icon} className="text-[20px]" />
              </span>
            </div>
            <p className="text-3xl font-black text-on-surface dark:text-white mt-2">{card.value}</p>
          </div>
        ))}
      </div>

      {banner && (
        <div className="mb-4 flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-4 py-3 rounded-2xl text-xs font-bold">
          <Icon name="check_circle" className="text-[18px]" />
          <span className="flex-1">{banner}</span>
          <button type="button" onClick={() => setBanner(null)} className="cursor-pointer">
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
      )}

      {loadError && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-xs font-bold">
          {loadError}
        </div>
      )}

      {/* Controls */}
      <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-2xl border border-outline-variant/60 dark:border-slate-800 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div>
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 block uppercase mb-1">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
            >
              <option value="ALL">All roles</option>
              {Object.keys(ROLE_LABELS).map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 block uppercase mb-1">Search</label>
            <div className="relative flex items-center bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3 py-1.5 w-64">
              <Icon name="search" className="text-outline dark:text-slate-400 text-[18px] mr-1.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or email"
                className="w-full bg-transparent border-none outline-none text-xs font-bold text-on-surface dark:text-white placeholder:text-outline"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="px-5 py-2.5 rounded-full bg-primary text-on-primary text-xs font-extrabold shadow-md hover:bg-primary-container active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Icon name="person_add" className="text-[18px]" />
          Create staff account
        </button>
      </div>

      {/* Directory */}
      <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-lg overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-outline-variant/60 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-on-surface dark:text-white flex items-center gap-2">
            <Icon name="badge" className="text-primary text-[20px]" />
            Staff &amp; user directory
          </h3>
          <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400 bg-surface-container-low dark:bg-slate-800 px-3 py-1 rounded-full">
            {visibleUsers.length} shown
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low dark:bg-slate-800 border-b border-outline-variant dark:border-slate-700 text-on-surface dark:text-white font-extrabold uppercase tracking-wider text-[11px]">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Department</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 dark:divide-slate-800 font-semibold text-on-surface-variant dark:text-slate-300">
              {visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-on-surface-variant dark:text-slate-400 font-medium">
                    No accounts match this filter.
                  </td>
                </tr>
              ) : (
                visibleUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-surface-container-low/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-bold text-on-surface dark:text-white">{u.name}</td>
                    <td className="p-4 font-mono text-[11px]">{u.email}</td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold text-primary bg-primary-fixed dark:bg-orange-950 dark:text-orange-200 px-2 py-0.5 rounded-full">
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      {u.departmentId?.name || <span className="italic text-on-surface-variant dark:text-slate-500">—</span>}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          disabled={String(u._id) === String(currentUser?._id)}
                          className="px-3 py-1.5 rounded-full bg-surface-container-low dark:bg-slate-800 hover:bg-surface-container dark:hover:bg-slate-700 text-on-surface dark:text-white font-bold disabled:opacity-40 transition-colors cursor-pointer"
                        >
                          Change role
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(u)}
                          disabled={String(u._id) === String(currentUser?._id)}
                          className={`px-3 py-1.5 rounded-full font-bold disabled:opacity-40 transition-colors cursor-pointer ${
                            u.isActive
                              ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-100'
                              : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          {u.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create staff modal */}
      {createOpen && (
        <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create staff account">
          <form onSubmit={handleCreate} className="space-y-3 text-left">
            <div>
              <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setField('role', e.target.value)}
                className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
              >
                {CREATABLE_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 font-medium">
                Passengers register themselves — only these three roles are provisioned here.
              </p>
            </div>

            {form.role === ROLES.OFFICER && (
              <div>
                <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">Department (required)</label>
                <select
                  value={form.departmentCode}
                  onChange={(e) => setField('departmentCode', e.target.value)}
                  className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- Select a department --</option>
                  {activeDepartments.map((d) => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 font-medium">
                  This decides which complaints they see and which complaints they can be assigned.
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">Full name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="e.g. Anita Sharma"
                className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="officer@railresolve.local"
                  className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">Password (min 8)</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">Confirm password</label>
                <input
                  type="password"
                  required
                  value={form.confirmPassword}
                  onChange={(e) => setField('confirmPassword', e.target.value)}
                  className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-xl text-xs font-bold">
                {formError}
              </div>
            )}

            <div className="pt-3 border-t border-outline-variant/60 dark:border-slate-700 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-low dark:hover:bg-slate-800 rounded-full cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 text-xs font-extrabold text-on-primary bg-primary hover:bg-primary-container disabled:opacity-50 rounded-full shadow-md active:scale-95 transition-all cursor-pointer"
              >
                {saving ? 'Creating...' : 'Create account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Role change modal */}
      {editingUser && (
        <Modal isOpen={Boolean(editingUser)} onClose={() => setEditingUser(null)} title={`Change role • ${editingUser.name}`}>
          <form onSubmit={handleRoleChange} className="space-y-3 text-left">
            <div>
              <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">New role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
              >
                {Object.keys(ROLE_LABELS).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>

            {editRole === ROLES.OFFICER && (
              <div>
                <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">Department (required)</label>
                <select
                  value={editDepartmentCode}
                  onChange={(e) => setEditDepartmentCode(e.target.value)}
                  className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- Select a department --</option>
                  {activeDepartments.map((d) => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            {editError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-xl text-xs font-bold">
                {editError}
              </div>
            )}

            <div className="pt-3 border-t border-outline-variant/60 dark:border-slate-700 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-low dark:hover:bg-slate-800 rounded-full cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 text-xs font-extrabold text-on-primary bg-primary hover:bg-primary-container disabled:opacity-50 rounded-full shadow-md active:scale-95 transition-all cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save role'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminUsers;
