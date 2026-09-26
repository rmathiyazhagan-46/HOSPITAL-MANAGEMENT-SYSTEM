import React, { useState, useEffect } from 'react';
import DashboardShell from '../../components/layout/DashboardShell';
import DataTable from '../../components/shared/DataTable';
import Badge from '../../components/shared/Badge';
import { Pill, Search } from 'lucide-react';
import api from '../../services/api';

const MedicineList = () => {
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        const res = await api.get('/pharmacy/medicines');
        setMedicines(res?.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMedicines();
  }, []);

  const filtered = medicines.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      header: 'Medication Name',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.name}</p>
          <p className="text-xs text-slate-500 line-clamp-1">{row.description}</p>
        </div>
      ),
    },
    {
      header: 'Therapeutic Category',
      accessor: 'category',
      render: (row) => <Badge variant="brand">{row.category}</Badge>,
    },
    {
      header: 'Dispensary Availability',
      accessor: 'availability_status',
      render: (row) => (
        <Badge variant={row.availability_status === 'In Stock' ? 'success' : 'neutral'}>
          {row.availability_status || 'In Stock'}
        </Badge>
      ),
    },
  ];

  return (
    <DashboardShell role="patient" title="Hospital Formulary & Medicine Directory">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medications by name or category..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="text-xs text-slate-500">
            Hospital Dispensary Directory • {medicines.length} Listed Items
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No medicines found in the directory."
        />
      </div>
    </DashboardShell>
  );
};

export default MedicineList;
