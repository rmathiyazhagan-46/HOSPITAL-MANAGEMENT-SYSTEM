import React, { useState, useEffect } from 'react';
import DashboardShell from '../../components/layout/DashboardShell';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import Badge from '../../components/shared/Badge';
import { 
  Pill, 
  Plus, 
  AlertCircle, 
  AlertTriangle, 
  Calendar, 
  Search, 
  Edit3, 
  Trash2, 
  Package, 
  Clock, 
  CheckCircle2,
  RefreshCw 
} from 'lucide-react';
import { 
  getPharmacyInventory, 
  addPharmacyMedicine, 
  updatePharmacyMedicine, 
  deletePharmacyMedicine, 
  updatePharmacyStock, 
  deletePharmacyStockBatch 
} from '../../services/adminAuthService';

const generateBatchNumber = (medName = '') => {
  const letters = medName ? medName.trim().replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() : '';
  const code = letters.length >= 2 ? letters : 'MED';
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BATCH-${code}-${year}-${rand}`;
};

const getTodayDate = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getDefaultExpiryDate = () => {
  const future = new Date();
  future.setFullYear(future.getFullYear() + 2);
  const yyyy = future.getFullYear();
  const mm = String(future.getMonth() + 1).padStart(2, '0');
  const dd = String(future.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const PharmacyInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [filterAlert, setFilterAlert] = useState('all'); // all, low_stock, expiring
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const [addForm, setAddForm] = useState({
    name: '',
    manufacture_date: getTodayDate(),
    unit_price: 50,
    description: '',
    batch_number: generateBatchNumber(''),
    quantity: 100,
    expiry_date: getDefaultExpiryDate(),
    reorder_level: 20,
    category: 'General',
  });

  const [editForm, setEditForm] = useState({
    medicine_name: '',
    manufacture_date: '',
    unit_price: 0,
    quantity: 0,
    batch_number: '',
    expiry_date: '',
    reorder_level: 20,
  });

  const handleOpenAddModal = () => {
    setAddForm({
      name: '',
      manufacture_date: getTodayDate(),
      unit_price: 50,
      description: '',
      batch_number: generateBatchNumber(''),
      quantity: 100,
      expiry_date: getDefaultExpiryDate(),
      reorder_level: 20,
      category: 'General',
    });
    setIsAddModalOpen(true);
  };

  const handleMedicineNameChange = (val) => {
    setAddForm((prev) => {
      const isAuto = !prev.batch_number || prev.batch_number.startsWith('BATCH-');
      return {
        ...prev,
        name: val,
        batch_number: isAuto ? generateBatchNumber(val) : prev.batch_number,
      };
    });
  };

  const loadInventory = async () => {
    try {
      setLoading(true);
      const res = await getPharmacyInventory();
      setInventory(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    try {
      await addPharmacyMedicine(addForm);
      setIsAddModalOpen(false);
      loadInventory();
      setAddForm({
        name: '',
        manufacture_date: getTodayDate(),
        unit_price: 50,
        description: '',
        batch_number: generateBatchNumber(''),
        quantity: 100,
        expiry_date: getDefaultExpiryDate(),
        reorder_level: 20,
        category: 'General',
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add medicine.');
    }
  };

  const handleOpenEdit = (row) => {
    setEditingItem(row);
    setEditForm({
      medicine_name: row.medicine?.name || '',
      manufacture_date: row.manufacture_date ? row.manufacture_date.split('T')[0] : '',
      unit_price: row.medicine?.unit_price || 0,
      quantity: row.quantity,
      batch_number: row.batch_number,
      expiry_date: row.expiry_date ? row.expiry_date.split('T')[0] : '',
      reorder_level: row.reorder_level || 20,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      // 1. Update medicine metadata
      await updatePharmacyMedicine(editingItem.medicine_id, {
        name: editForm.medicine_name,
        unit_price: Number(editForm.unit_price),
      });

      // 2. Update stock batch details
      await updatePharmacyStock({
        medicine_id: editingItem.medicine_id,
        batch_number: editForm.batch_number,
        quantity: Number(editForm.quantity),
        manufacture_date: editForm.manufacture_date || null,
        expiry_date: editForm.expiry_date,
        reorder_level: Number(editForm.reorder_level),
      });

      setIsEditModalOpen(false);
      setEditingItem(null);
      loadInventory();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update stock batch.');
    }
  };

  const handleDeleteBatch = async (row) => {
    if (window.confirm(`Delete batch #${row.batch_number} for ${row.medicine?.name}?`)) {
      try {
        await deletePharmacyStockBatch(row.id);
        loadInventory();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete batch.');
      }
    }
  };

  const handleDeleteMedicine = async (row) => {
    if (window.confirm(`Delete medicine ${row.medicine?.name} and ALL its batches completely?`)) {
      try {
        await deletePharmacyMedicine(row.medicine_id);
        loadInventory();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete medicine.');
      }
    }
  };

  // Compute alerts
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const lowStockBatches = inventory.filter((item) => item.quantity <= (item.reorder_level || 20));
  const expiringBatches = inventory.filter((item) => {
    if (!item.expiry_date) return false;
    const exp = new Date(item.expiry_date);
    return exp <= thirtyDaysFromNow;
  });

  const filteredInventory = inventory.filter((item) => {
    const medName = item.medicine?.name?.toLowerCase() || '';
    const category = item.medicine?.category?.toLowerCase() || '';
    const batch = item.batch_number?.toLowerCase() || '';
    const matchesSearch = medName.includes(search.toLowerCase()) || 
                          category.includes(search.toLowerCase()) || 
                          batch.includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterAlert === 'low_stock') {
      return item.quantity <= (item.reorder_level || 20);
    }
    if (filterAlert === 'expiring') {
      if (!item.expiry_date) return false;
      return new Date(item.expiry_date) <= thirtyDaysFromNow;
    }
    return true;
  });

  const columns = [
    {
      header: 'Medicine Catalog',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Pill className="w-3.5 h-3.5 text-brand-600" />
            {row.medicine?.name || 'N/A'}
          </p>
          <p className="text-xs text-slate-400">{row.medicine?.category}</p>
        </div>
      ),
    },
    { 
      header: 'Batch Number', 
      accessor: 'batch_number', 
      render: (row) => (
        <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {row.batch_number}
        </span>
      ) 
    },
    {
      header: 'Available Stock',
      accessor: 'quantity',
      render: (row) => {
        const isLow = row.quantity <= (row.reorder_level || 20);
        return (
          <div className="flex items-center gap-2">
            <span className={`font-bold text-xs ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
              {row.quantity} units
            </span>
            {isLow && (
              <Badge variant="danger" className="text-[10px] py-0.5">
                Low (&lt;20)
              </Badge>
            )}
          </div>
        );
      },
    },
    { 
      header: 'Unit Price (Admin)', 
      render: (row) => (
        <span className="font-semibold text-xs text-slate-800">
          ₹{Number(row.medicine?.unit_price || 0).toFixed(2)}
        </span>
      ) 
    },
    { 
      header: 'Mfg Date', 
      render: (row) => (
        <span className="text-slate-700 text-xs font-medium">
          {row.manufacture_date ? new Date(row.manufacture_date).toLocaleDateString('en-GB') : '—'}
        </span>
      ) 
    },
    { 
      header: 'Expiry Date', 
      render: (row) => {
        if (!row.expiry_date) return 'N/A';
        const exp = new Date(row.expiry_date);
        const isExpired = exp < now;
        const isNear = exp <= thirtyDaysFromNow;
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <span className={isExpired ? 'text-rose-600 font-bold' : isNear ? 'text-amber-600 font-bold' : 'text-slate-700'}>
              {exp.toLocaleDateString('en-GB')}
            </span>
            {isExpired && <Badge variant="danger" className="text-[10px]">Expired</Badge>}
            {!isExpired && isNear && <Badge variant="warning" className="text-[10px]">Near Expiry (&lt;30d)</Badge>}
          </div>
        );
      }
    },

    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            title="Edit Medicine & Batch"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteBatch(row)}
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="Delete this Batch"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteMedicine(row)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-[10px] font-semibold"
            title="Delete Entire Medicine Catalog"
          >
            Del Med
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardShell role="admin" title="Pharmacy Inventory & Batch Control">
      <div className="space-y-6">
        {/* Stock Alert Warning Banners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            lowStockBatches.length > 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${lowStockBatches.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold">Low Stock Warning (&lt;20 units)</h4>
                <p className="text-[11px] text-slate-500">{lowStockBatches.length} batches requiring immediate restocking</p>
              </div>
            </div>
            <button
              onClick={() => setFilterAlert(filterAlert === 'low_stock' ? 'all' : 'low_stock')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                filterAlert === 'low_stock' ? 'bg-rose-600 text-white border-rose-600' : 'border-rose-300 text-rose-700 hover:bg-rose-100'
              }`}
            >
              {filterAlert === 'low_stock' ? 'Showing Low Stock' : 'Filter Low Stock'}
            </button>
          </div>

          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            expiringBatches.length > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${expiringBatches.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold">Expiry Warning (&lt;30 days)</h4>
                <p className="text-[11px] text-slate-500">{expiringBatches.length} batches expired or nearing expiration date</p>
              </div>
            </div>
            <button
              onClick={() => setFilterAlert(filterAlert === 'expiring' ? 'all' : 'expiring')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                filterAlert === 'expiring' ? 'bg-amber-600 text-white border-amber-600' : 'border-amber-300 text-amber-700 hover:bg-amber-100'
              }`}
            >
              {filterAlert === 'expiring' ? 'Showing Expiring' : 'Filter Expiring'}
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by medicine, batch..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500 shadow-sm"
              />
            </div>
            {filterAlert !== 'all' && (
              <button
                onClick={() => setFilterAlert('all')}
                className="text-xs text-brand-600 hover:text-brand-800 font-semibold"
              >
                Clear Filter
              </button>
            )}
          </div>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine & Batch</span>
          </button>
        </div>

        <DataTable
          columns={columns}
          data={filteredInventory}
          emptyMessage="No pharmacy stock batches matching criteria."
        />

        {/* Add Medicine Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add New Medicine Catalog & Stock Batch"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleAddMedicine} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Medicine Name</label>
              <input
                type="text"
                required
                value={addForm.name}
                onChange={(e) => handleMedicineNameChange(e.target.value)}
                placeholder="e.g. Azithromycin 500mg"
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Manufacture Date</label>
                <input
                  type="date"
                  required
                  value={addForm.manufacture_date}
                  onChange={(e) => setAddForm({ ...addForm, manufacture_date: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500 text-slate-800"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Unit Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={addForm.unit_price}
                  onChange={(e) => setAddForm({ ...addForm, unit_price: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Batch Number</label>
                  <button
                    type="button"
                    onClick={() => setAddForm(prev => ({ ...prev, batch_number: generateBatchNumber(prev.name) }))}
                    className="text-[11px] text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1 hover:underline"
                    title="Generate New Unique Batch Number"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto-gen</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={addForm.batch_number}
                  onChange={(e) => setAddForm({ ...addForm, batch_number: e.target.value })}
                  placeholder="e.g. BATCH-AZI-2026-1049"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500 font-mono font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Initial Quantity</label>
                <input
                  type="number"
                  required
                  value={addForm.quantity}
                  onChange={(e) => setAddForm({ ...addForm, quantity: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Expiry Date</label>
              <input
                type="date"
                required
                value={addForm.expiry_date}
                onChange={(e) => setAddForm({ ...addForm, expiry_date: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500 text-slate-800"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors shadow-sm"
              >
                Save to Inventory
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Medicine & Batch Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingItem(null);
          }}
          title={`Edit Stock Batch: #${editingItem?.batch_number || ''}`}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleUpdate} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Medicine Name</label>
              <input
                type="text"
                required
                value={editForm.medicine_name}
                onChange={(e) => setEditForm({ ...editForm, medicine_name: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Manufacture Date</label>
                <input
                  type="date"
                  value={editForm.manufacture_date}
                  onChange={(e) => setEditForm({ ...editForm, manufacture_date: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500 text-slate-800"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Unit Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editForm.unit_price}
                  onChange={(e) => setEditForm({ ...editForm, unit_price: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Batch Number</label>
                <input
                  type="text"
                  required
                  value={editForm.batch_number}
                  onChange={(e) => setEditForm({ ...editForm, batch_number: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Current Stock Quantity</label>
                <input
                  type="number"
                  required
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Expiry Date</label>
              <input
                type="date"
                required
                value={editForm.expiry_date}
                onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500 text-slate-800"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingItem(null);
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
      </div>
    </DashboardShell>
  );
};

export default PharmacyInventory;

