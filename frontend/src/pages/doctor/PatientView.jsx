import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import DashboardShell from '../../components/layout/DashboardShell';
import { FileText, Calendar, Pill, User, ArrowLeft, Clock } from 'lucide-react';
import { getPatientHistory } from '../../services/doctorAuthService';

const PatientView = () => {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      if (!patientId) {
        setLoading(false);
        return;
      }
      try {
        const res = await getPatientHistory(patientId);
        setHistory(res?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [patientId]);

  return (
    <DashboardShell role="doctor" title="Patient Clinical History & Records">
      <div className="space-y-6">
        <Link
          to="/doctor/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Consultation Queue</span>
        </Link>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Patient Clinical History</h3>
              {patientId ? (
                <p className="text-xs text-slate-400 font-mono">Record Target ID #{patientId}</p>
              ) : (
                <p className="text-xs text-slate-400 font-mono">No patient selected</p>
              )}
            </div>
          </div>
          {patientId && <span className="text-xs text-slate-500 font-medium">{history.length} Previous Records</span>}
        </div>

        {!patientId ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-2">
              <User className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700">Please select a patient from the Appointments Queue</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Clinical history is retrieved on a per-patient basis. Go to your consultation queue and click the "History" button on a specific patient's row.
            </p>
            <Link to="/doctor/dashboard" className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition-colors">
              Go to Appointments Queue
            </Link>
          </div>
        ) : history.length > 0 ? (
          <div className="space-y-4">
            {history.map((record) => (
              <div
                key={record.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-4 h-4 text-brand-600" />
                    <span>Consultation Date: {new Date(record.consultation_date).toLocaleDateString()}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700">
                    Consulting Doctor: {record.doctor?.name || 'Staff Doctor'}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Diagnosis & Clinical Notes
                  </h4>
                  <p className="text-sm text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                    {record.diagnosis_notes}
                  </p>
                </div>

                {record.prescriptions && record.prescriptions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-brand-600" />
                      <span>Prescribed Medications</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {record.prescriptions.flatMap((p) => p.items || []).map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-slate-200 bg-white text-xs space-y-1"
                        >
                          <p className="font-bold text-slate-800">{item.medicine?.name || 'Medicine'}</p>
                          <div className="flex items-center flex-wrap gap-2 text-slate-500 text-[11px]">
                            <span>Dose: {item.dosage}</span>
                            <span>•</span>
                            <span>Dur: {item.duration}</span>
                          </div>
                          
                          {/* Dosage Schedule Display */}
                          {item.dosage_schedule && Array.isArray(item.dosage_schedule) && item.dosage_schedule.length > 0 ? (
                            <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                              {item.dosage_schedule.map((slot, sIdx) => (
                                <span key={sIdx} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-brand-50 text-brand-700 text-[10px] font-semibold">
                                  {slot.time} ({slot.timing})
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-slate-500 text-[11px] mt-1 pt-1 border-t border-slate-100">
                              Freq: {item.frequency || 'As directed'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
            {loading ? 'Retrieving clinical records...' : 'No previous medical records for this patient.'}
          </div>
        )}
      </div>
    </DashboardShell>
  );
};

export default PatientView;
