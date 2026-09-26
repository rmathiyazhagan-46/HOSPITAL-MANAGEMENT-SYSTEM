/**
 * Chatbot Intents & Static Knowledge Map for Patient HealthBot Assistant
 * Configured with symptom-to-department routing, hospital FAQs, emergency alerts,
 * and reception handoff rules. Structured for drop-in AI LLM engine replacement.
 */

const intents = [
  // 1. Critical Emergencies (High Urgency)
  {
    id: 'emergency',
    keywords: ['emergency', 'ambulance', 'heart attack', 'unconscious', 'severe bleeding', 'cannot breathe', 'stroke', 'choking'],
    department: 'Emergency & Critical Care',
    urgency: 'HIGH',
    reply: '⚠️ EMERGENCY ALERT: If you or a loved one is in a life-threatening state, immediate emergency medical attention is critical. Please call our 24/7 hotline at 108 or report directly to our Emergency Trauma Unit.',
    actions: ['Call 24/7 Emergency (108)', 'Emergency Ward Location', 'Speak to Reception'],
    cardType: 'emergency',
  },

  // 2. Cardiology
  {
    id: 'cardiology',
    keywords: ['chest pain', 'chest tightness', 'palpitations', 'irregular heartbeat', 'high blood pressure', 'cholesterol', 'cardiac', 'angina'],
    department: 'Cardiology',
    urgency: 'MEDIUM',
    reply: 'Your symptoms suggest cardiovascular evaluation. Dr. Rajesh Sharma and our Cardiology team specialize in heart health, ECG diagnostics, and hypertension management.',
    actions: ['Book with Dr. Rajesh Sharma', 'View Cardiologists', 'Check Available Slots'],
    cardType: 'doctor_suggestion',
  },

  // 3. Neurology
  {
    id: 'neurology',
    keywords: ['headache', 'migraine', 'dizziness', 'seizure', 'numbness', 'tremor', 'vertigo', 'loss of balance', 'nerve pain'],
    department: 'Neurology',
    urgency: 'NORMAL',
    reply: 'Neurological symptoms like persistent headaches or dizziness are best evaluated by Dr. Priya Nair in our Neurology Department.',
    actions: ['Book with Dr. Priya Nair', 'View Neurologists', 'Schedule Consultation'],
    cardType: 'doctor_suggestion',
  },

  // 4. Orthopedics & Musculoskeletal
  {
    id: 'orthopedics',
    keywords: ['joint pain', 'knee pain', 'back pain', 'bone', 'fracture', 'arthritis', 'sprain', 'ligament', 'shoulder pain'],
    department: 'Orthopedics',
    urgency: 'NORMAL',
    reply: 'For joint, bone, and spine concerns, our Orthopedic specialists provide digital X-rays, arthroscopy, and joint rehabilitation.',
    actions: ['Book Orthopedic Doctor', 'View Available Slots', 'Check Symptoms'],
    cardType: 'doctor_suggestion',
  },

  // 5. Pediatrics & Child Healthcare
  {
    id: 'pediatrics',
    keywords: ['child', 'baby', 'infant', 'toddler', 'vaccination', 'pediatric', 'growth', 'measles', 'child fever'],
    department: 'Pediatrics',
    urgency: 'NORMAL',
    reply: 'Our Pediatrics clinic offers specialized infant and adolescent care, developmental milestone tracking, and routine vaccinations.',
    actions: ['Book Pediatrician', 'Vaccination Schedule', 'View Doctors'],
    cardType: 'doctor_suggestion',
  },

  // 6. Dermatology
  {
    id: 'dermatology',
    keywords: ['skin', 'rash', 'acne', 'itching', 'allergy', 'eczema', 'hair loss', 'psoriasis', 'hives'],
    department: 'Dermatology',
    urgency: 'NORMAL',
    reply: 'For skin, hair, and allergic reactions, a consultation with our Dermatology clinic can provide targeted topical or systemic relief.',
    actions: ['Book Dermatologist', 'View Doctors', 'Check Slots'],
    cardType: 'doctor_suggestion',
  },

  // 7. General Medicine / Primary Care
  {
    id: 'general_medicine',
    keywords: ['fever', 'cold', 'cough', 'flu', 'fatigue', 'weakness', 'body ache', 'vomiting', 'nausea', 'infection', 'stomach pain', 'indigestion', 'acidity'],
    department: 'General Medicine',
    urgency: 'NORMAL',
    reply: 'Common symptoms like fever, cough, fatigue, or stomach upset are routinely diagnosed and treated by Dr. Amit Patel in General Medicine.',
    actions: ['Book with Dr. Amit Patel', 'Check Slots Today', 'View General Physicians'],
    cardType: 'doctor_suggestion',
  },

  // 8. Hospital Timings FAQ
  {
    id: 'hospital_timings',
    keywords: ['timing', 'timings', 'hours', 'open', 'when do you open', 'opd hours', 'closing time', 'working hours'],
    urgency: 'NORMAL',
    reply: '🏥 PulseCare Hospital Operational Hours:\n• OPD Consultation: Monday – Saturday, 08:00 AM – 08:00 PM\n• Pharmacy: Open 24 Hours, 7 Days a Week\n• Emergency & Trauma: 24/7 round-the-clock service',
    actions: ['Book an Appointment', 'Emergency Helpline', 'Visiting Hours'],
    cardType: 'info',
  },

  // 9. Visiting Hours FAQ
  {
    id: 'visiting_hours',
    keywords: ['visiting hours', 'visit patient', 'visitor timing', 'icu visit', 'visiting policy'],
    urgency: 'NORMAL',
    reply: '🕒 Inpatient Visitor Policy:\n• General Wards: 04:00 PM – 07:00 PM daily (Maximum 2 visitors per patient)\n• ICU / Critical Care: 11:00 AM – 12:00 PM & 05:00 PM – 06:00 PM (1 visitor at a time)\n• Please wear clean masks in sterile zones.',
    actions: ['Hospital Timings', 'Connect to Reception', 'Book Appointment'],
    cardType: 'info',
  },

  // 10. Insurance & Billing FAQ
  {
    id: 'insurance_billing',
    keywords: ['insurance', 'tpa', 'cashless', 'mediclaim', 'coverage', 'bill', 'receipt', 'payment options'],
    urgency: 'NORMAL',
    reply: '💳 PulseCare Hospital accepts all major TPAs and health insurance providers for Cashless hospitalization. You can also settle consultation and pharmacy invoices securely via UPI, Card, or Cash from your Bills & Payments portal.',
    actions: ['Go to Bills & Payments', 'Connect to Reception', 'Hospital Timings'],
    cardType: 'info',
  },

  // 11. Report / Status Tracking Intent
  {
    id: 'track_report',
    keywords: [
      'track report',
      'track my report',
      'check status',
      'report status',
      'my prescription',
      'my appointment',
      'treatment status',
      'doctor visit status',
    ],
    urgency: 'NORMAL',
    reply: 'I am fetching your real-time medical and appointment status from your patient record...',
    actions: ['View Medical Records', 'Book an Appointment', 'Connect to Reception'],
    cardType: 'track_status',
  },

  // 12. Human Reception Escalation Intent
  {
    id: 'reception_escalation',
    keywords: ['reception', 'operator', 'human', 'speak to person', 'call me', 'talk to human', 'agent', 'support desk', 'customer care'],
    urgency: 'NORMAL',
    reply: 'I can connect you with our Hospital Front Desk & Reception team. Our concierge desk is available 24/7.',
    actions: ['Call Reception (+91 98765 43210)', 'Book an Appointment', 'Hospital Timings'],
    cardType: 'reception_card',
  },

  // 13. Conversational Appointment Booking
  {
    id: 'book_appointment',
    keywords: ['book appointment', 'schedule appointment', 'consult doctor', 'appointment', 'see doctor', 'meet specialist'],
    urgency: 'NORMAL',
    reply: 'I would be happy to help you book a specialist appointment! Please pick a department or symptom below to get started:',
    actions: ['Cardiology', 'Neurology', 'General Medicine', 'Orthopedics', 'Dermatology', 'Pediatrics'],
    cardType: 'department_picker',
  },
];

const fallbackReply = {
  reply: "I am your PulseCare AI Health Assistant. I can assist with symptom triaging, finding doctor schedules, booking appointments, answering hospital FAQs, and checking your report status. How can I help you right now?",
  actions: ['Book an Appointment', 'Check Symptoms', 'Track My Report', 'Hospital Timings', 'Connect to Reception'],
  cardType: 'fallback',
};

/**
 * Match user query against defined symptom, FAQ, and workflow intents
 */
const matchIntent = (userMessage = '') => {
  const query = userMessage.toLowerCase().trim();

  for (const intent of intents) {
    const matchedKeyword = intent.keywords.find(keyword => query.includes(keyword));
    if (matchedKeyword) {
      return {
        matched: true,
        intentId: intent.id,
        matchedKeyword,
        department: intent.department || null,
        urgency: intent.urgency || 'NORMAL',
        reply: intent.reply,
        actions: intent.actions || [],
        cardType: intent.cardType || 'text',
      };
    }
  }

  return {
    matched: false,
    ...fallbackReply,
  };
};

module.exports = {
  intents,
  fallbackReply,
  matchIntent,
};
