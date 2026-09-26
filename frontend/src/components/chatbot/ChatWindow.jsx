import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  X, 
  Sparkles, 
  Minus, 
  RotateCcw, 
  Calendar, 
  Clock, 
  Stethoscope 
} from 'lucide-react';
import MessageBubble from './MessageBubble';
import QuickReplyChips from './QuickReplyChips';
import SymptomChecker from './SymptomChecker';
import { sendChatMessage, trackPatientStatus } from '../../services/chatbotService';
import { bookAppointment, getAvailableSlots } from '../../services/appointmentService';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const INITIAL_CHIPS = [
  'Book an Appointment',
  'Check Symptoms',
  'Find a Doctor',
  'Track My Report',
  'Hospital Timings',
  'Connect to Reception',
];

const ChatWindow = ({ onClose }) => {
  const { user, patientAuth } = useAuth();
  const currentUser = patientAuth?.user || user;
  const navigate = useNavigate();

  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: `Hello ${currentUser?.name ? currentUser.name.split(' ')[0] : 'there'}! 👋 I am your PulseCare HealthBot Assistant.\n\nHow can I help you today? You can check symptoms, book an appointment, track your reports, or ask hospital FAQs.`,
      time: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [chips, setChips] = useState(INITIAL_CHIPS);
  const [loading, setLoading] = useState(false);

  // Conversational booking state machine
  const [bookingState, setBookingState] = useState({
    active: false,
    doctor: null,
    date: null,
    slot: null,
    blood_group: null,
  });

  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Helper to append a user message and a bot response
  const appendUserMessage = (text) => {
    const userMsg = {
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    return userMsg;
  };

  const appendBotMessage = (text, cardType = 'text', cardData = null, customChips = null) => {
    const botMsg = {
      sender: 'bot',
      text,
      cardType,
      cardData,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, botMsg]);
    if (customChips) {
      setChips(customChips);
    }
  };

  // Conversational Booking: Step 2 - Doctor selected, prompt for Date
  const handleDoctorSelected = (doctor) => {
    setBookingState({
      active: true,
      doctor,
      date: null,
      slot: null,
    });

    const d0 = new Date();
    const d1 = new Date(); d1.setDate(d1.getDate() + 1);
    const d2 = new Date(); d2.setDate(d2.getDate() + 2);
    const d3 = new Date(); d3.setDate(d3.getDate() + 3);

    const fmt = (d) => d.toISOString().split('T')[0];

    appendBotMessage(
      `Great! You've selected Dr. ${doctor.name} (${doctor.specialization}).\n\nWhich day would you prefer for your consultation?`,
      'text',
      null,
      [`Date: ${fmt(d0)} (Today)`, `Date: ${fmt(d1)} (Tomorrow)`, `Date: ${fmt(d2)}`, `Date: ${fmt(d3)}`, 'Cancel Booking']
    );
  };

  // Conversational Booking: Step 3 - Date selected, fetch real-time available slots
  const handleDateSelected = async (dateStr) => {
    const currentDoctor = bookingState.doctor;
    if (!currentDoctor) {
      appendBotMessage('Please select a doctor first.', 'text', null, INITIAL_CHIPS);
      return;
    }

    setBookingState((prev) => ({
      ...prev,
      date: dateStr,
    }));

    setLoading(true);
    try {
      const res = await getAvailableSlots(currentDoctor.id, dateStr);
      const data = res?.data || {};

      if (data.isDayUnavailable || !data.availableSlots || data.availableSlots.length === 0) {
        const reason = data.unavailabilityReason || 'The doctor is not taking appointments on this date.';
        appendBotMessage(
          `⚠️ Dr. ${currentDoctor.name} is unavailable on ${dateStr} (${reason}).\n\nPlease choose an alternate consultation date:`,
          'text',
          null,
          [
            `Date: ${new Date(Date.now() + 86400000).toISOString().split('T')[0]} (Tomorrow)`,
            `Date: ${new Date(Date.now() + 172800000).toISOString().split('T')[0]}`,
            `Date: ${new Date(Date.now() + 259200000).toISOString().split('T')[0]}`,
            'Cancel Booking',
          ]
        );
        return;
      }

      // Present actual available slots excluding doctor-unavailable & booked slots
      const slotChips = data.availableSlots.slice(0, 6).map((s) => `Slot: ${s}`);
      slotChips.push('Cancel Booking');

      appendBotMessage(
        `Selected consultation date: ${dateStr}.\n\nDr. ${currentDoctor.name} has the following open slots. Please choose your preferred time:`,
        'text',
        null,
        slotChips
      );
    } catch (err) {
      appendBotMessage(
        `Unable to fetch slots for ${dateStr}. Please choose another date or book directly through the booking wizard.`,
        'text',
        null,
        ['Cancel Booking']
      );
    } finally {
      setLoading(false);
    }
  };

  // Conversational Booking: Step 4 - Slot selected, execute Shared Booking API
  const handleSlotSelected = async (slotStr) => {
    const currentDoctor = bookingState.doctor;
    const currentDate = bookingState.date;

    if (!currentDoctor || !currentDate) {
      appendBotMessage('Booking session expired. Please start again by picking a doctor.', 'text', null, INITIAL_CHIPS);
      setBookingState({ active: false, doctor: null, date: null, slot: null, blood_group: null });
      return;
    }

    setBookingState((prev) => ({
      ...prev,
      slot: slotStr,
    }));

    // Proceed to Blood Group step
    const patientBloodGroup = currentUser?.blood_group || user?.blood_group;
    if (patientBloodGroup) {
      appendBotMessage(
        `Booking with blood group: ${patientBloodGroup} (from your profile) — is that correct?`,
        'text',
        null,
        ['Yes, Confirm', 'Change Blood Group', 'Cancel Booking']
      );
    } else {
      appendBotMessage(
        "What's your blood group?",
        'text',
        null,
        ['BG: A+', 'BG: A-', 'BG: B+', 'BG: B-', 'BG: AB+', 'BG: AB-', 'BG: O+', 'BG: O-', 'BG: Unknown', 'Cancel Booking']
      );
    }
  };

  // Conversational Booking: Step 5 - Final booking execution
  const executeBooking = async (bloodGroup) => {
    const { doctor: currentDoctor, date: currentDate, slot: currentSlot } = bookingState;

    if (!currentDoctor || !currentDate || !currentSlot) {
      appendBotMessage('Booking session expired. Please start again.', 'text', null, INITIAL_CHIPS);
      setBookingState({ active: false, doctor: null, date: null, slot: null, blood_group: null });
      return;
    }

    setLoading(true);
    appendBotMessage(`Scheduling your consultation with Dr. ${currentDoctor.name} on ${currentDate} at ${currentSlot}...`);

    try {
      // Calls the SHARED appointment booking API with source="chatbot"
      const res = await bookAppointment({
        doctor_id: currentDoctor.id,
        appointment_date: currentDate,
        time_slot: currentSlot,
        blood_group: bloodGroup,
        reason: 'Booked via PulseCare AI HealthBot Assistant',
        source: 'chatbot',
      });

      if (res?.success && res?.data) {
        appendBotMessage(
          `🎉 Your consultation has been booked successfully!`,
          'booking_confirmed',
          {
            id: res.data.id,
            doctorName: currentDoctor.name,
            date: currentDate,
            time: currentSlot,
          },
          ['Track My Report', 'Check Symptoms', 'Hospital Timings']
        );
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to confirm booking.';
      appendBotMessage(
        `⚠️ ${errorMsg}\n\nPlease try another slot or schedule through the manual wizard:`,
        'text',
        null,
        ['Slot: 10:00 - 10:30', 'Slot: 15:00 - 15:30', 'Switch Doctor', 'Cancel Booking']
      );
    } finally {
      setLoading(false);
      setBookingState({ active: false, doctor: null, date: null, slot: null, blood_group: null });
    }
  };

  // Real-time report tracking triggered by user
  const handleTrackReport = async () => {
    setLoading(true);
    try {
      const res = await trackPatientStatus();
      if (res?.success && res?.data) {
        appendBotMessage(
          'Here is your live patient medical and appointment status:',
          'track_status',
          res.data,
          ['Book an Appointment', 'Hospital Timings', 'Connect to Reception']
        );
      }
    } catch (err) {
      appendBotMessage(
        'Could not retrieve medical records at this moment. Please check the Medical Records portal.',
        'text',
        null,
        INITIAL_CHIPS
      );
    } finally {
      setLoading(false);
    }
  };

  // Main message dispatcher
  const handleSend = async (userText) => {
    const textToSend = userText || input;
    if (!textToSend.trim()) return;

    appendUserMessage(textToSend);
    setInput('');

    const normalized = textToSend.trim();

    // 1. Cancel Booking
    if (normalized.toLowerCase() === 'cancel booking') {
      setBookingState({ active: false, doctor: null, date: null, slot: null, blood_group: null });
      appendBotMessage('Appointment booking cancelled. How else can I assist you?', 'text', null, INITIAL_CHIPS);
      return;
    }

    // 2. Booking Date Chip intercept
    if (normalized.startsWith('Date: ')) {
      const datePart = normalized.replace('Date: ', '').split(' ')[0];
      handleDateSelected(datePart);
      return;
    }

    // 3. Booking Slot Chip intercept
    if (normalized.startsWith('Slot: ')) {
      const slotPart = normalized.replace('Slot: ', '').trim();
      handleSlotSelected(slotPart);
      return;
    }

    // 4. Blood Group intercept
    if (normalized.startsWith('BG: ')) {
      const bgPart = normalized.replace('BG: ', '').trim();
      const actualBg = bgPart === 'Unknown' ? 'Unknown' : bgPart;
      setBookingState((prev) => ({ ...prev, blood_group: actualBg }));
      executeBooking(actualBg);
      return;
    }

    if (normalized === 'Yes, Confirm' && bookingState.slot) {
      executeBooking(user?.blood_group);
      return;
    }

    if (normalized === 'Change Blood Group') {
      appendBotMessage(
        "What's your blood group?",
        'text',
        null,
        ['BG: A+', 'BG: A-', 'BG: B+', 'BG: B-', 'BG: AB+', 'BG: AB-', 'BG: O+', 'BG: O-', 'BG: Unknown', 'Cancel Booking']
      );
      return;
    }

    // 5. Track My Report Intercept
    if (normalized.toLowerCase().includes('track') || normalized.toLowerCase().includes('report status')) {
      handleTrackReport();
      return;
    }

    // 5. Connect to Reception Intercept
    if (normalized.toLowerCase().includes('reception') || normalized.toLowerCase().includes('call reception')) {
      appendBotMessage(
        'Here is the contact card for our Hospital Central Reception & Support desk:',
        'reception_card',
        {
          title: 'PulseCare Central Reception & Patient Concierge',
          phone: '+91 98765 43210',
          hours: '24 Hours / 7 Days a Week',
        },
        ['Book an Appointment', 'Hospital Timings', 'Check Symptoms']
      );
      return;
    }

    // 6. General Intent matching via backend
    setLoading(true);
    try {
      const response = await sendChatMessage(textToSend);
      if (response && response.data) {
        const { reply, actions, cardType, cardData, suggestedDoctors } = response.data;

        // If doctors were suggested and cardType wasn't set, use doctor_suggestion
        let finalCardType = cardType || 'text';
        let finalCardData = cardData;

        if (suggestedDoctors && suggestedDoctors.length > 0 && !finalCardData) {
          finalCardType = 'doctor_suggestion';
          finalCardData = {
            department: response.data.matchedDepartment || 'Specialist Care',
            doctors: suggestedDoctors,
          };
        }

        appendBotMessage(
          reply,
          finalCardType,
          finalCardData,
          actions && actions.length > 0 ? actions : INITIAL_CHIPS
        );
      }
    } catch (err) {
      appendBotMessage(
        "I'm experiencing difficulty contacting our triage engine. Please call our 24/7 reception desk at +91 98765 43210 or try again in a moment.",
        'reception_card',
        {
          title: 'Emergency & Reception Helpline',
          phone: '+91 98765 43210',
          hours: 'Open 24/7',
        },
        INITIAL_CHIPS
      );
    } finally {
      setLoading(false);
    }
  };

  // Action callback from MessageBubble child components
  const handleActionClick = (action, payload) => {
    if (action === 'select_doctor') {
      handleDoctorSelected(payload);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        sender: 'bot',
        text: `Hello ${user?.name ? user.name.split(' ')[0] : 'there'}! 👋 How can I assist you with symptoms, appointments, or medical records today?`,
        time: 'Just now',
      },
    ]);
    setChips(INITIAL_CHIPS);
    setBookingState({ active: false, doctor: null, date: null, slot: null, blood_group: null });
  };

  return (
    <div className="w-[360px] sm:w-[400px] h-[560px] max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-teal-600 text-white p-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm leading-tight flex items-center gap-1.5">
              <span>HealthBot Assistant</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            </h4>
            <span className="text-[11px] text-teal-100 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              PulseCare Medical AI
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleResetChat}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
            title="Reset Conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
            title="Minimize Chatbot"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto bg-slate-50/60 space-y-2">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} onActionClick={handleActionClick} />
        ))}

        {/* Typing indicator while bot thinks */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 p-2 bg-white/90 rounded-xl border border-slate-200/80 w-fit animate-pulse">
            <Bot className="w-4 h-4 text-brand-600 animate-spin" />
            <span>HealthBot is analyzing...</span>
            <span className="inline-flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-bounce [animation-delay:0.4s]" />
            </span>
          </div>
        )}

        {/* Quick Symptom Checker Drawer */}
        <SymptomChecker onSelectSymptom={(symptom) => handleSend(symptom)} />

        <div ref={scrollRef} />
      </div>

      {/* Quick Action Chips */}
      <QuickReplyChips chips={chips} onSelect={(chip) => handleSend(chip)} />

      {/* Message Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type symptoms, queries, or 'track report'..."
          className="flex-1 py-2.5 px-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-slate-800 placeholder-slate-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 rounded-xl bg-brand-600 text-white disabled:opacity-40 hover:bg-brand-700 active:scale-95 transition-all shadow-sm"
          aria-label="Send Message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
