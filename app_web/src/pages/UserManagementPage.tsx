import { useState, useEffect } from 'react';
import { userService, User, CreateUserData } from '../services/api/userService';
import { useToast } from '../components/Toaster';
import LoadingSpinner from '../components/LoadingSpinner';

const roles = [
  { value: 'admin', label: 'Administrateur', permissions: ['read', 'write', 'delete', 'manage_users'] },
  { value: 'analyst', label: 'Analyste', permissions: ['read', 'write', 'analyze'] },
  { value: 'data_scientist', label: 'Data Scientist', permissions: ['read', 'train_models'] },
];

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState<CreateUserData>({
    name: '',
    email: '',
    password: '',
    role: 'analyst',
  });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const userData = await userService.getAllUsers();
      setUsers(userData);
    } catch (error) {
      toast('Erreur', 'Impossible de charger les utilisateurs', 'danger');
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast('Erreur', 'Tous les champs sont requis', 'danger');
      return;
    }

    setSubmitting(true);
    try {
      await userService.createUser(newUser);
      toast('Succès', 'Utilisateur créé avec succès', 'success');
      setShowAddUser(false);
      setNewUser({ name: '', email: '', password: '', role: 'analyst' });
      loadUsers(); // Reload the list
    } catch (error: any) {
      toast('Erreur', error.message || 'Échec de la création de l\'utilisateur', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await userService.updateUser(userId, { role: newRole });
      toast('Succès', 'Rôle mis à jour avec succès', 'success');
      loadUsers();
    } catch (error: any) {
      toast('Erreur', error.message || 'Échec de la mise à jour du rôle', 'danger');
    }
  };

  const handleStatusToggle = async (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await userService.updateUser(userId, { status: newStatus });
      toast('Succès', `Utilisateur ${newStatus === 'active' ? 'activé' : 'désactivé'}`, 'success');
      loadUsers();
    } catch (error: any) {
      toast('Erreur', error.message || 'Échec de la mise à jour du statut', 'danger');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      await userService.deleteUser(userId);
      toast('Succès', 'Utilisateur supprimé avec succès', 'success');
      loadUsers();
    } catch (error: any) {
      toast('Erreur', error.message || 'Échec de la suppression', 'danger');
    }
  };

  const getRoleLabel = (role: string) => {
    return roles.find(r => r.value === role)?.label || role;
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'text-green-400 bg-green-400/20' : 'text-red-400 bg-red-400/20';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-white/5 p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#13739f]">Gestion des Utilisateurs</h1>
            <p className="mt-2 text-slate-400">Gérez les utilisateurs, rôles et accès.</p>
          </div>
          <button
            onClick={() => setShowAddUser(true)}
            className="rounded-xl bg-[#13739f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f5a7a]"
          >
            Ajouter Utilisateur
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-300">Nom</th>
                <th className="text-left py-3 px-4 text-slate-300">Email</th>
                <th className="text-center py-3 px-4 text-slate-300">Rôle</th>
                <th className="text-center py-3 px-4 text-slate-300">Statut</th>
                <th className="text-center py-3 px-4 text-slate-300">Dernière Connexion</th>
                <th className="text-center py-3 px-4 text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-900/50">
                  <td className="py-3 px-4 font-medium text-white">{user.name}</td>
                  <td className="py-3 px-4 text-slate-300">{user.email}</td>
                  <td className="py-3 px-4 text-center">
                    <select
                      aria-label={`Changer le rôle de ${user.name}`}
                      title={`Changer le rôle de ${user.name}`}
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-900/50 px-2 py-1 text-xs text-white outline-none focus:border-[#13739f]"
                    >
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${getStatusColor(user.status)}`}>
                      {user.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-400">{user.last_login || 'Jamais'}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleStatusToggle(user.id)}
                        className="rounded-lg bg-slate-700 px-2 py-1 text-xs font-semibold text-white transition hover:bg-slate-600"
                      >
                        {user.status === 'active' ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Permissions */}
      <div className="rounded-3xl border border-slate-800 bg-white/5 p-6">
        <h3 className="text-lg font-semibold text-[#13739f] mb-4">Permissions par Rôle</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((role) => (
            <div key={role.value} className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
              <h4 className="font-semibold text-white mb-2">{role.label}</h4>
              <div className="space-y-1">
                {role.permissions.map((permission) => (
                  <div key={permission} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#13739f]"></span>
                    <span className="text-sm text-slate-300 capitalize">{permission.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-[#13739f] mb-4">Créer un Nouveau Compte</h3>
            <form onSubmit={handleCreateUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Nom complet</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 text-sm text-white outline-none focus:border-[#13739f]"
                    placeholder="Entrez le nom complet"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 text-sm text-white outline-none focus:border-[#13739f]"
                    placeholder="Entrez l'email"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Mot de passe</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 text-sm text-white outline-none focus:border-[#13739f]"
                    placeholder="Entrez le mot de passe"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Rôle</label>
                  <select
                    aria-label="Sélectionner le rôle du nouvel utilisateur"
                    title="Sélectionner le rôle du nouvel utilisateur"
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 text-sm text-white outline-none focus:border-[#13739f]"
                  >
                    {roles.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-[#13739f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f5a7a] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Création...' : 'Créer le compte'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
