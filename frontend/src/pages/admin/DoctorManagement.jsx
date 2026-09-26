import React, { useState, useEffect } from 'react';
import DashboardShell from '../../components/layout/DashboardShell';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import Badge from '../../components/shared/Badge';
import { 
  Stethoscope, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  Key, 
  CheckCircle2, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  CalendarCheck,
} from 'lucide-react';
import { 
  getDoctorsList, 
  createDoctorAccount, 
  updateDoctorAccount, 
  deleteDoctorAccount 
} from '../../services/adminAuthService';
import { getDepartments } from '../../services/appointmentService';
import DoctorAvailabilityModal from '../../components/admin/DoctorAvailabilityModal';

const DoctorManagement = () => {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [selectedDoctorForAvailability, setSelectedDoctorForAvailability] = useState(null);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newCredentialsBanner, setNewCredentialsBanner] = useState(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    department_id: '',
    specialization: '',
    qualification: '',
    experience_years: 5,
    consultation_fee: 600,
  });

  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    department_id: '',
    specialization: '',
    qualification: '',
    experience_years: 5,
    consultation_fee: 600,
  });

  const loadData = async () => {
    try {
      const [docRes, deptRes] = await Promise.all([
        getDoctorsList(),
        getDepartments(),
      ]);
      setDoctors(docRes?.data || []);
      const depts = deptRes?.data || [];
      setDepartments(depts);
      if (depts.length > 0 && !createForm.department_id) {
        setCreateForm(prev => ({ ...prev, department_id: depts[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSync = () => {
      loadData();
    };

    const handleStorage = (e) => {
      if (e.key === 'doctor_availability_updated') {
        loadData();
      }
    };

    window.addEventListener('doctor-availability-changed', handleSync);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleSync);

    return () => {
      window.removeEventListener('doctor-availability-changed', handleSync);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await createDoctorAccount(createForm);
      setIsCreateModalOpen(false);
      loadData();
      if (res?.data?.temp_password) {
        setNewCredentialsBanner({
          employee_id: res.data.employee_id,
          temp_password: res.data.temp_password,
          name: res.data.name,
        });
      }
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        department_id: departments[0]?.id || '',
        specialization: '',
        qualification: '',
        experience_years: 5,
        consultation_fee: 600,
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create doctor account.');
    }
  };

  const handleOpenEdit = (doc) => {
    setEditingDoctor(doc);
    setEditForm({
      name: doc.name || '',
      phone: doc.phone || '',
      department_id: doc.department_id || (departments[0]?.id || ''),
      specialization: doc.specialization || '',
      qualification: doc.qualification || '',
      experience_years: doc.experience_years || 0,
      consultation_fee: doc.consultation_fee || 0,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingDoctor) return;
    try {
      await updateDoctorAccount(editingDoctor.id, editForm);
      setIsEditModalOpen(false);
      setEditingDoctor(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update doctor profile.');
    }
  };

  const handleDelete = async (doc) => {
    if (window.confirm(`Are you sure you want to deactivate/delete Dr. ${doc.name} (${doc.employee_id})?`)) {
      try {
        await deleteDoctorAccount(doc.id);
        loadData();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete doctor account.');
      }
    }
  };

  const filteredDoctors = doctors.filter((doc) =>
    doc.name.toLowerCase().includes(search.toLowerCase()) ||
    doc.employee_id.toLowerCase().includes(search.toLowerCase()) ||
    doc.specialization.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { 
      header: 'Employee ID', 
      accessor: 'employee_id', 
      render: (row) => (
        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200">
          {row.employee_id}
        </span>
      ) 
    },
    {
      header: 'Doctor Name',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-brand-600" />
            {row.name}
          </p>
          <p className="text-xs text-slate-400">{row.email} • {row.phone}</p>
        </div>
      ),
    },
    { header: 'Department', render: (row) => row.department?.name || 'General Medicine' },
    { header: 'Specialization', accessor: 'specialization' },
    { header: 'Experience', render: (row) => `${row.experience_years} yrs` },
    { header: 'Consultation Fee', render: (row) => `₹${Number(row.consultation_fee).toFixed(0)}` },
    {
      header: 'Status',
      render: (row) => {
        const isAvailable = row.availability_status === 'available';
        return (
          <div className="inline-flex items-center gap-1">
            <Badge variant={isAvailable ? 'success' : 'danger'}>
              {row.availability_text || (isAvailable ? '🟢 Available' : '🔴 Unavailable Today')}
            </Badge>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setSelectedDoctorForAvailability(row);
              setIsAvailabilityModalOpen(true);
            }}
            className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
            title="Manage Doctor Availability & Leaves (Admin Override)"
          >
            <CalendarCheck className="w-4 h-4 text-teal-600" />
          </button>
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            title="Edit Doctor"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Deactivate / Delete Doctor"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardShell role="admin" title="Doctor Credentialing & Management">
      <div className="space-y-6">
        {/* Banner for newly created doctor credentials */}
        {newCredentialsBanner && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-900">
                  Doctor Account Created: {newCredentialsBanner.name}
                </h4>
                <p className="text-xs text-emerald-700 mt-1">
                  Generated Credentials: <strong className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300">Emp ID: {newCredentialsBanner.employee_id}</strong> | <strong className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300">Temp Password: {newCredentialsBanner.temp_password}</strong>
                </p>
                <p className="text-[11px] text-emerald-600 mt-1">Share these temporary credentials with the physician for their first login.</p>
              </div>
            </div>
            <button
              onClick={() => setNewCredentialsBanner(null)}
              className="text-xs text-emerald-700 font-semibold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search doctors by name, ID or specialty..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500 shadow-sm"
            />
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Doctor</span>
          </button>
        </div>

        <DataTable
          columns={columns}
          data={filteredDoctors}
          emptyMessage="No doctors registered in the system."
        />

        {/* Add Doctor Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Register New Doctor Profile"
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center gap-2 text-blue-800">
              <Key className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Unique Employee ID (DOC-YYYY-XXXX) and temporary password will be automatically generated.</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Dr. Full Name"
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="doctor@hospital.org"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Department</label>
                <select
                  value={createForm.department_id}
                  onChange={(e) => setCreateForm({ ...createForm, department_id: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-brand-500"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Specialization</label>
                <input
                  type="text"
                  required
                  value={createForm.specialization}
                  onChange={(e) => setCreateForm({ ...createForm, specialization: e.target.value })}
                  placeholder="e.g. Interventional Cardiology"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Qualification</label>
                <input
                  type="text"
                  required
                  value={createForm.qualification}
                  onChange={(e) => setCreateForm({ ...createForm, qualification: e.target.value })}
                  placeholder="MBBS, MD, DM"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Experience (Yrs)</label>
                <input
                  type="number"
                  min="0"
                  value={createForm.experience_years}
                  onChange={(e) => setCreateForm({ ...createForm, experience_years: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Consultation Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={createForm.consultation_fee}
                  onChange={(e) => setCreateForm({ ...createForm, consultation_fee: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors shadow-sm"
              >
                Create Account & Issue Credentials
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Doctor Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingDoctor(null);
          }}
          title={`Edit Doctor Profile: ${editingDoctor?.name || ''}`}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleUpdate} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Doctor Name</label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Department</label>
                <select
                  value={editForm.department_id}
                  onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-brand-500"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Specialization</label>
                <input
                  type="text"
                  required
                  value={editForm.specialization}
                  onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Qualification</label>
                <input
                  type="text"
                  required
                  value={editForm.qualification}
                  onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Experience (Yrs)</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.experience_years}
                  onChange={(e) => setEditForm({ ...editForm, experience_years: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.consultation_fee}
                  onChange={(e) => setEditForm({ ...editForm, consultation_fee: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingDoctor(null);
                }}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>

        {/* Admin Doctor Availability Override Modal */}
        <DoctorAvailabilityModal
          doctor={selectedDoctorForAvailability}
          isOpen={isAvailabilityModalOpen}
          onClose={() => {
            setIsAvailabilityModalOpen(false);
            setSelectedDoctorForAvailability(null);
            loadData();
          }}
        />
      </div>
    </DashboardShell>
  );
};

export default DoctorManagement;

