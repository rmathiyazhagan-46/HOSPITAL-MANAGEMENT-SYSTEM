import React from 'react';
import { 
  Bot, 
  User, 
  Phone, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Stethoscope, 
  FileText, 
  AlertCircle, 
  ShieldCheck, 
  Building2,
} from 'lucide-react';

const MessageBubble = ({ message, onActionClick }) => {
  const isBot = message.sender === 'bot';
  const { cardType, cardData } = message;

  return (
    <div className={`flex gap-2.5 mb-3.5 ${isBot ? 'justify-start' : 'justify-end'}`}>
      {isBot && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
          <Bot className="w-4 h-4" />
        </div>
      )}

      <div className={`max-w-[85%] space-y-2.5 ${isBot ? 'text-left' : 'text-right'}`}>
        {/* Main Text Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-xs leading-relaxed inline-block ${
            isBot
              ? 'bg-white text-slate-800 rounded-tl-sm border border-slate-200/90 shadow-xs text-left'
              : 'bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-tr-sm shadow-md text-left'
          }`}
        >
          <p className="whitespace-pre-line font-medium">{message.text}</p>
          <span
            className={`block text-[10px] mt-1.5 ${
              isBot ? 'text-slate-400' : 'text-brand-100 text-right'
            }`}
          >
            {message.time || 'Just now'}
          </span>
        </div>

        {/* 1. Mini Doctor Suggestion Cards */}
        {cardType === 'doctor_suggestion' && cardData?.doctors && (
          <div className="space-y-2 text-left animate-in fade-in zoom-in duration-200">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Recommended Specialists ({cardData.department})
            </p>
            <div className="space-y-2">
              {cardData.doctors.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 hover:border-brand-300 shadow-xs flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-100">
                      {doc.name.replace('Dr. ', '').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{doc.name}</p>
                      <p className="text-[10px] text-teal-600 font-medium truncate">{doc.specialization}</p>
                      <p className="text-[10px] text-slate-400">
                        {doc.experience_years ? `${doc.experience_years} yrs exp • ` : ''}₹{Number(doc.consultation_fee).toFixed(0)} fee
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onActionClick && onActionClick('select_doctor', doc)}
                    className="shrink-0 py-1.5 px-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                  >
                    <span>Book</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Real-Time Report Tracking Card */}
        {cardType === 'track_status' && cardData && (
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs text-left space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-600" />
                Live Patient Status Card
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                Verified
              </span>
            </div>

            {/* Appointment Item */}
            {cardData.appointment ? (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Latest Consultation</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 capitalize">
                    {cardData.appointment.status}
                  </span>
                </div>
                <p className="text-slate-600">Doctor: <strong>Dr. {cardData.appointment.doctor}</strong></p>
                <p className="text-slate-500 flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-slate-400" /> {cardData.appointment.date}
                  <Clock className="w-3 h-3 text-brand-500" /> {cardData.appointment.time}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">No active appointment in queue.</p>
            )}

            {/* Consultation & Prescriptions Item */}
            {cardData.consultation && (
              <div className="p-2.5 bg-teal-50/50 rounded-xl border border-teal-100 text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Clinical Record</span>
                  <span className="text-[10px] text-teal-700 font-bold">{cardData.consultation.date}</span>
                </div>
                <p className="text-slate-600">Diagnosis: <em>{cardData.consultation.diagnosis}</em></p>
                <p className="text-teal-700 font-semibold">
                  Prescription: {cardData.consultation.prescriptionStatus} ({cardData.consultation.medicineCount} medicines)
                </p>
              </div>
            )}

            {/* Invoicing Item */}
            {cardData.invoice && (
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                <span className="text-slate-500">Latest Invoice #{cardData.invoice.id}</span>
                <span className="font-bold text-slate-800">
                  ₹{Number(cardData.invoice.amount).toFixed(2)}{' '}
                  <span className={cardData.invoice.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}>
                    ({cardData.invoice.status})
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* 3. Conversational Booking Confirmation Card */}
        {cardType === 'booking_confirmed' && cardData && (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-left space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Appointment Scheduled via HealthBot!</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-emerald-100 text-[11px] space-y-1 text-slate-700">
              <div className="flex justify-between items-center pb-1 border-b border-slate-100">
                <span className="text-slate-400">Appointment ID</span>
                <span className="font-mono font-bold text-brand-700">#{cardData.id}</span>
              </div>
              <p>Doctor: <strong>Dr. {cardData.doctorName}</strong></p>
              <p>Schedule: <strong>{cardData.date}</strong> at <strong>{cardData.time}</strong></p>
              <p className="text-[10px] text-slate-400 pt-1">
                A confirmation slip has been recorded in your patient appointments dashboard.
              </p>
            </div>
          </div>
        )}

        {/* 4. Reception Escalation Card */}
        {cardType === 'reception_card' && cardData && (
          <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 text-left space-y-2 text-xs text-amber-950 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{cardData.title}</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Our front desk reception is ready to assist you. You can call directly or visit the reception desk in person.
            </p>
            <div className="pt-1 flex flex-col gap-1.5">
              <a
                href={`tel:${cardData.phone}`}
                className="py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-center text-xs transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call {cardData.phone}</span>
              </a>
              <span className="text-[10px] text-slate-500 text-center">
                Operating Hours: {cardData.hours}
              </span>
            </div>
          </div>
        )}
      </div>

      {!isBot && (
        <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
