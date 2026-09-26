import React, { useState, useEffect } from 'react';
import DashboardShell from '../../components/layout/DashboardShell';
import { 
  FileText, 
  Calendar, 
  Pill, 
  Stethoscope, 
  Download, 
} from 'lucide-react';
import { getPatientMedicalRecords, downloadPrescriptionPdf } from '../../services/patientAuthService';

const MedicalRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    const loadAllRecords = async () => {
      try {
        setLoading(true);
        const medRes = await getPatientMedicalRecords().catch(() => ({ data: [] }));
        setRecords(medRes?.data || []);
      } catch (err) {
        console.error('Error loading patient medical data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAllRecords();
  }, []);

  const handleDownloadPrescription = async (consultationId) => {
    try {
      setDownloadingId(consultationId);
      await downloadPrescriptionPdf(consultationId);
    } catch (err) {
      console.error('Failed to download report:', err);
      alert('Could not download medical report slip.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <DashboardShell role="patient" title="My Medical History & Prescriptions">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Digital Health Records & Prescriptions</h3>
            <p className="text-xs text-slate-400">
              Access your clinical diagnoses, treatment history, and prescription slips
            </p>
          </div>
        </div>

        {/* DOCTOR ASSESSMENTS & PRESCRIPTIONS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Doctor Assessments & Prescription Slips</h4>
              <p className="text-[11px] text-slate-400">
                {records.length} consultation records documented by hospital specialists
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              Retrieving clinical consultation records...
            </div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No medical consultation records found yet.
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">
                          Consultation by {record.doctor?.name || 'Hospital Specialist'}
                        </h4>
                        <p className="text-xs text-teal-700 font-medium">{record.doctor?.specialization}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{new Date(record.consultation_date).toLocaleDateString()}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadPrescription(record.id)}
                        disabled={downloadingId === record.id}
                        className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingId === record.id ? 'Generating...' : 'Download Slip (PDF)'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Doctor Assessment & Diagnosis Notes
                    </span>
                    <p className="text-xs text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed font-medium">
                      {record.diagnosis_notes}
                    </p>
                  </div>

                  {record.prescriptions && record.prescriptions.length > 0 && (
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Pill className="w-3.5 h-3.5 text-brand-600" />
                        <span>Prescribed Medication Schedule</span>
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {record.prescriptions.flatMap((p) => p.items || []).map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs space-y-1 shadow-2xs"
                          >
                            <p className="font-bold text-slate-800">{item.medicine?.name}</p>
                            <div className="flex flex-wrap items-center gap-2 text-slate-500 text-[11px] pt-0.5">
                              <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-semibold">Dosage: {item.dosage}</span>
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">{item.duration}</span>
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

                      {record.prescriptions[0]?.notes && (
                        <p className="text-xs text-slate-600 bg-amber-50/60 p-3 rounded-xl border border-amber-200/60 mt-2">
                          <strong>Doctor's Advice & Instructions:</strong> {record.prescriptions[0].notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default MedicalRecords;
