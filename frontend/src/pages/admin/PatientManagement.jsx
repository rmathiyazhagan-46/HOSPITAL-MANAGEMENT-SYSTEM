import React, { useState, useEffect } from 'react';
import DashboardShell from '../../components/layout/DashboardShell';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import Badge from '../../components/shared/Badge';
import { 
  Search, 
  ShieldCheck, 
  Edit3, 
  Trash2, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  AlertCircle 
} from 'lucide-react';
import { 
  getAllPatientsList, 
  updatePatientAccount, 
  deletePatientAccount 
} from '../../services/adminAuthService';

const PatientManagement = () => {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    blood_group: '',
    address: '',
    emergency_contact: '',
  });

  const loadPatients = async () => {
    try {
      setLoading(true);
      const res = await getAllPatientsList();
      setPatients(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleOpenEdit = (p) => {
    setEditingPatient(p);
    setEditForm({
      name: p.name || '',
      phone: p.phone || '',
      email: p.email || '',
      blood_group: p.blood_group || '',
      address: p.address || '',
      emergency_contact: p.emergency_contact || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingPatient) return;
    try {
      await updatePatientAccount(editingPatient.id, editForm);
      setIsEditModalOpen(false);
      setEditingPatient(null);
      loadPatients();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update patient details.');
    }
  };

  const handleDelete = async (p) => {
    if (window.confirm(`Are you sure you want to deactivate/delete patient ${p.name} (ID: ${p.patient_id})?`)) {
      try {
        await deletePatientAccount(p.id);
        loadPatients();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete patient account.');
      }
    }
  };

  const filteredPatients = patients.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.patient_id?.includes(search) ||
    p.phone?.includes(search) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      header: '12-Digit Patient ID',
      accessor: 'patient_id',
      render: (row) => (
        <span className="font-mono font-bold text-xs text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
          {row.patient_id}
        </span>
      ),
    },
    {
      header: 'Patient Name',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.name}</p>
          <p className="text-xs text-slate-400">{row.email || 'No email'}</p>
        </div>
      ),
    },
    { header: 'Contact Phone', accessor: 'phone' },
    {
      header: 'Last Visit',
      render: (row) => {
        if (!row.last_visit) {
          return <span className="text-slate-400 text-xs italic">No visits yet</span>;
        }
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
            <Calendar className="w-3.5 h-3.5 text-brand-600" />
            <span>{new Date(row.last_visit).toLocaleDateString()}</span>
          </div>
        );
      },
    },
    {
      header: 'Aadhar Privacy',
      render: () => (
        <Badge variant="success" className="gap-1">
          <ShieldCheck className="w-3 h-3" /> Encrypted SHA-256
        </Badge>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            title="Edit Patient"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Deactivate / Delete Patient"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardShell role="admin" title="Patient Registry & Medical Index">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by 12-digit ID, name, phone..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500 shadow-sm"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Total Indexed Patients: <span className="font-bold text-slate-800">{patients.length}</span>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredPatients}
          emptyMessage="No patients registered yet."
        />

        {/* Edit Patient Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingPatient(null);
          }}
          title={`Edit Patient: ${editingPatient?.name || ''} (${editingPatient?.patient_id || ''})`}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleUpdate} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Full Legal Name</label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contact Phone</label>
                <input
                  type="tel"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Blood Group</label>
                <select
                  value={editForm.blood_group}
                  onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-brand-500"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Emergency Contact</label>
                <input
                  type="tel"
                  value={editForm.emergency_contact}
                  onChange={(e) => setEditForm({ ...editForm, emergency_contact: e.target.value })}
                  placeholder="+91 98765 00000"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Residential Address</label>
              <textarea
                rows={3}
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingPatient(null);
                }}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors shadow-sm"
              >
                Save Patient
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardShell>
  );
};

export default PatientManagement;

