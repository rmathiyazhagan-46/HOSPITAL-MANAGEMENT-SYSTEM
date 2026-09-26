# 🏥 Metro General Apex Hospital Management System (HMS)

A complete, production-grade full-stack Hospital Management System (HMS) web application engineered with role-based portal separation (**Admin, Doctor, Patient**), an **AI Chatbot Assistant**, and a normalized (3NF) relational database schema powered by **Node.js, Express, Sequelize ORM, MySQL**, and **React (Vite) + Tailwind CSS**.

---

## 🌟 Key Features & Supported Workflows

- **End-to-End Clinical Flow:**
  - **Patient Registration:** Validated 12-digit Patient ID assignment with encrypted/hashed Aadhar storage at rest.
  - **Conflict-Free Appointment Booking:** Composite indexed `(doctor_id, appointment_date, time_slot)` checks preventing double bookings.
  - **Doctor Clinical Consultation:** Scheduled appointment queue, patient medical history review, diagnosis recording, and structured medication prescription.
  - **Pharmacy Inventory & Formulary:** Batched medicine inventory with quantity and expiry controls (admin restricted visibility).
  - **Billing, Invoicing & Tax PDFs:** Automatic consultation invoice creation, simulated UPI/Card payment gateway, and instant GST-compliant PDF invoice download using `jsPDF`.
  - **AI Chatbot Assistant:** Real-time symptom triage, emergency alert warnings, and automatic department/doctor recommendations.

---

## 🏛 Architecture & Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v7, Axios, Lucide React, Recharts, React Hook Form, Zod |
| **Backend** | Node.js, Express.js, JWT (jsonwebtoken), bcryptjs, express-validator, cors, helmet, morgan, express-rate-limit, jsPDF, multer, nodemailer |
| **Database** | MySQL (with SQLite zero-config local development support) & Sequelize ORM |
| **Security** | Role-gated middleware, rate-limiting, SHA-256 Aadhar encryption at rest, HTTP security headers |

---

## 📂 Project Directory Structure

```text
c:\Users\ELCOT\OneDrive\Desktop\HOSPITAL MANAGEMENT\
├── backend/
│   ├── config/
│   │   └── db.js                 # Sequelize connection, pooling & dialect handler
│   ├── controllers/
│   │   ├── adminAuthController.js
│   │   ├── doctorAuthController.js
│   │   ├── patientAuthController.js
│   │   ├── doctorController.js
│   │   ├── patientController.js
│   │   ├── appointmentController.js
│   │   ├── pharmacyController.js
│   │   ├── billingController.js
│   │   └── chatbotController.js
│   ├── middleware/
│   │   ├── auth.js               # verifyToken & authorizeRoles
│   │   ├── rateLimiter.js        # API & Auth rate limiters
│   │   └── errorHandler.js       # Centralized JSON error formatters
│   ├── models/
│   │   ├── Admin.js
│   │   ├── Department.js
│   │   ├── Doctor.js
│   │   ├── Patient.js
│   │   ├── Appointment.js
│   │   ├── Consultation.js
│   │   ├── Prescription.js
│   │   ├── PrescriptionItem.js
│   │   ├── Medicine.js
│   │   ├── MedicineStock.js
│   │   ├── Invoice.js
│   │   ├── Payment.js
│   │   └── index.js              # 3NF associations & relations
│   ├── routes/
│   │   ├── adminAuthRoutes.js
│   │   ├── doctorAuthRoutes.js
│   │   ├── patientAuthRoutes.js
│   │   ├── doctorRoutes.js
│   │   ├── patientRoutes.js
│   │   ├── appointmentRoutes.js
│   │   ├── pharmacyRoutes.js
│   │   ├── billingRoutes.js
│   │   ├── chatbotRoutes.js
│   │   └── index.js              # Combined API router
│   ├── utils/
│   │   └── chatbotIntents.js     # Keyword/symptom triage map
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── booking/          # DepartmentSelect, DoctorCard, SlotPicker, BookingForm, ConfirmationScreen
│   │   │   ├── chatbot/          # ChatWidget, ChatWindow, MessageBubble, QuickReplyChips, SymptomChecker
│   │   │   ├── layout/           # Navbar, Sidebar (role-based), DashboardShell
│   │   │   └── shared/           # Badge, DataTable, Modal, StatCard, StepProgress
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Multi-portal token & session storage
│   │   ├── pages/
│   │   │   ├── admin/            # AdminDashboard, DoctorManagement, PatientManagement, BillingRevenue, PharmacyInventory
│   │   │   ├── auth/             # Landing, AdminLogin, DoctorLogin, PatientLogin, PatientRegister, PatientRegisterSuccess
│   │   │   ├── doctor/           # DoctorDashboard, PatientView, Prescribe
│   │   │   └── patient/          # PatientPortal, BookAppointment, MedicalRecords, BillsAndPayments, MedicineList
│   │   ├── routes/
│   │   │   └── ProtectedRoute.jsx # Role-gated route guards
│   │   ├── services/             # Axios API services
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
└── README.md
```

---

## 🗄 Database Schema (3NF Normalized)

1. **Admins:** `id`, `hospital_name`, `hospital_email`, `password_hash`
2. **Departments:** `id`, `name`, `description`
3. **Doctors:** `id`, `employee_id` [UNIQUE], `password_hash`, `name`, `email`, `phone`, `department_id` [FK], `specialization`, `qualification`, `experience_years`, `consultation_fee`, `availability_status`
4. **Patients:** `id`, `patient_id` [UNIQUE 12-digit], `name`, `phone`, `dob`, `aadhar_number` [UNIQUE, Encrypted SHA-256], `email`
5. **Appointments:** `id`, `patient_id` [FK], `doctor_id` [FK], `department_id` [FK], `appointment_date`, `time_slot`, `status` (`pending`, `confirmed`, `completed`, `cancelled`), `source` (`manual`, `chatbot`)
   - Composite Index: `(doctor_id, appointment_date, time_slot)`
6. **Consultations:** `id`, `appointment_id` [FK, 1:1], `doctor_id` [FK], `patient_id` [FK], `diagnosis_notes`, `consultation_date`
7. **Prescriptions:** `id`, `consultation_id` [FK], `doctor_id` [FK], `patient_id` [FK], `notes`
8. **PrescriptionItems:** `id`, `prescription_id` [FK], `medicine_id` [FK], `dosage`, `frequency`, `duration`
9. **Medicines:** `id`, `name`, `category`, `unit_price`, `description`
10. **MedicineStock:** `id`, `medicine_id` [FK], `batch_number`, `quantity`, `expiry_date`, `reorder_level` *(Admin visibility only)*
11. **Invoices:** `id`, `patient_id` [FK], `invoice_type` (`consultation`, `pharmacy`, `final`), `amount`, `status` (`pending`, `paid`)
12. **Payments:** `id`, `invoice_id` [FK], `amount_paid`, `payment_mode` (`cash`, `card`, `upi`, `netbanking`), `paid_at`

---

## 🚀 Setup & Execution Instructions

### Prerequisites
- Node.js (v18 or newer)
- npm (v9 or newer)
- MySQL Server (v8.0+) or SQLite for instant local zero-config testing

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies (already pre-configured)
npm install

# Configure environment variables
# Copy .env.example to .env if not already created
cp .env.example .env

# To use MySQL:
# Set DB_DIALECT=mysql, DB_NAME=hospital_management_db, DB_USER=root, DB_PASSWORD=your_password in .env
# To use SQLite (default plug-and-play):
# Keep DB_DIALECT=sqlite in .env

# Start Backend Server
npm run dev
# Or production start
npm start
```
*Backend runs on `http://localhost:5000` (Health Check: `http://localhost:5000/api/health`)*

### 2. Frontend Setup

```bash
# In a separate terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite Development Server
npm run dev

# Or build production bundle
npm run build
```
*Frontend runs on `http://localhost:5173`*

---

## 🔑 Authentication Architecture & Credentials

The system operates **three distinct, isolated authentication pipelines** rather than a single shared login page:

### 1. Hospital Admin Portal
- **Route:** `/login/admin`
- **Fields:** `Hospital Name`, `Hospital Email`, `Password` (with show/hide eye toggle)
- **Security:** Verified against single seeded hospital row using bcrypt. JWT issued with `role: "admin"`.
- **Default Credentials:**
  - Hospital Name: `Metro General Apex Hospital`
  - Hospital Email: `admin@hospital.org`
  - Password: `admin123`
- **Error On Failure:** `"Invalid hospital email or password"`
- **Redirects:** `/admin/dashboard`

### 2. Doctor Clinical Portal
- **Route:** `/login/doctor`
- **Fields:** `Doctor Employee ID` (e.g. `DOC-2026-0001`), `Password` (with show/hide eye toggle)
- **Security:** Verified by employee ID + bcrypt hash. Admin generates doctors with sequence `DOC-{YEAR}-{4-digit sequence}` (auto-incremented & collision checked). JWT issued with `role: "doctor"`.
- **Pre-Configured Accounts:**
  - Dr. Rajesh Sharma (Cardiology): `DOC-2026-0001` / `Doctor@123`
  - Dr. Priya Nair (Neurology): `DOC-2026-0002` / `Doctor@123`
  - Dr. Amit Patel (General Medicine): `DOC-2026-0003` / `Doctor@123`
- **Error On Failure:** `"Invalid Employee ID or password"`
- **Redirects:** `/doctor/dashboard`

### 3. Patient Portal
- **Registration Route:** `/register/patient`
  - **Fields:** `Full Name`, `Phone Number`, `Date of Birth`, `Aadhar Number` (validated exactly 12 numeric digits), `Email ID`
  - **On Success:** Auto-generates a unique 12-digit numeric Patient ID (collision checked). Shows confirmation screen with ID + `"Save this ID — you'll need it to log in"` + copy button.
- **Login Route:** `/login/patient`
  - **Fields:** `12-digit Patient ID`, `Full Name`, `Date of Birth` (**No password!**)
  - **Security & Rate Limiting:** All 3 fields must match exactly. Protected by a dedicated rate limiter allowing **max 5 attempts per 15 minutes** per Patient ID / IP.
  - **Error On Failure:** `"Details do not match our records"` (generic message to prevent brute-force enumeration).
  - **Redirects:** `/patient/portal`
  - JWT issued with `role: "patient"`.

---

## 🧪 Automated Testing Commands

```bash
# In backend directory:
npm run test:features    # Test all 4 new feature enhancements (SMS, Switch Doctor, Dropdowns, Doctor Notifications)
npm run test:clinical    # Test full end-to-end clinical workflow cycle
npm run test:db          # Test database connection & model sync
npm run test:auth        # Test all 3 login flows, error messages, and 3-field patient auth
npm run test:rate-limit  # Test patient login 5-attempt rate limiter (HTTP 429)
npm run test:permissions # Test 24-assertion role permission matrix, 403 blocks & data masking
npm run test:appointments # Test appointment booking, concurrency conflict (409), & PDF download
npm run test:chatbot     # Test symptom triage, FAQs, reception escalation, report tracking & 403 guards

# In frontend directory:
npm run build            # Verify all React pages, routes, and Tailwind styles build cleanly
```

---

## 🚀 Feature Enhancements (March 2026)

### 1. SMS Notification on Patient Registration
- **Gateway Integration (`backend/utils/smsService.js`)**:
  - Reusable SMS notification service powered by **Twilio**.
  - Automatically dispatches welcome SMS upon successful registration (`POST /api/patients/register` or `POST /api/auth/patient/register`):
    ```text
    "Welcome to Metro General Apex Hospital. Your Patient ID is {patientId}. Save this ID — you'll need it to log in."
    ```
  - **Non-Blocking Resilience**: Wrapped in a `try/catch` block so patient registration always succeeds immediately even if SMS delivery encounters network latency or provider errors.
  - **Twilio Activation Configuration (`.env`)**:
    ```env
    TWILIO_ACCOUNT_SID=your_twilio_account_sid
    TWILIO_AUTH_TOKEN=your_twilio_auth_token
    TWILIO_PHONE_NUMBER=your_twilio_phone_number
    ```
    *Note: When test or unconfigured credentials are used in development, the service runs in sandbox simulation mode, logging the exact SMS payload and recipient E.164 number without breaking local workflows.*

### 2. "Switch Doctor" Option During Appointment Booking
- **Booking Wizard (Step 2 Pick Date & Slot)**:
  - "Switch Doctor" button allows patients to seamlessly jump back to the Doctor Selection step while keeping the selected department pre-populated.
- **Already-Booked Appointment Details (`ConfirmationScreen` & `PatientPortal`)**:
  - Direct "Switch Doctor" button on the appointment confirmation screen and upcoming consultation card.
  - Takes the patient back to Doctor Selection for the same department.
  - Reuses the existing `POST /api/appointments` endpoint passing `existing_appointment_id`.
  - Atomically modifies the existing appointment record in place within a database transaction, re-checking slot conflicts (HTTP 409 guard) and updating consultation invoices without creating duplicate appointment records.

### 3. Prescription Medicine Dropdowns
- **Centralized Config (`frontend/src/utils/prescriptionOptions.js`)**:
  - Standardized medical option lists for Dosage, Frequency, and Duration:
    - **Dosage**: `250mg`, `500mg`, `650mg`, `1000mg`, `1 tablet`, `2 tablets`, `5ml`, `10ml`, `1 teaspoon`, `2 teaspoons`.
    - **Frequency**: `Once a day (OD)`, `Twice a day (BD)`, `Thrice a day (TDS)`, `Four times a day (QID)`, `Every 6 hours`, `Every 8 hours`, `Before food`, `After food`, `At bedtime`, `As needed (SOS)`.
    - **Duration**: `1 day`, `3 days`, `5 days`, `7 days`, `10 days`, `14 days`, `1 month`, `2 months`, `3 months`, `Ongoing/Continuous`.
- **Doctor Consultation Screen (`Prescribe.jsx`)**:
  - Controlled `<select>` dropdowns replace free-text fields.
  - Seamlessly maps to existing `PrescriptionItem` database schema fields (`dosage`, `frequency`, `duration`).

### 4. Doctor Notifications on Patient Booking
- **Database Model (`backend/models/Notification.js`)**:
  - Relational schema storing `id`, `recipient_type` (`doctor`/`patient`/`admin`), `recipient_id`, `message`, `is_read`, `created_at`.
- **Automatic Triggers**:
  - Whenever a patient books or switches an appointment (via manual booking wizard or AI chatbot), an in-app notification row is created for the assigned doctor:
    ```text
    "New appointment booked by {patientName} on {date} at {timeSlot}"
    ```
  - Simultaneously triggers a doctor alert SMS via `smsService.js`.
- **Doctor Dashboard Navbar**:
  - Live interactive Bell icon displays unread badge count (with animated pulse indicator).
  - Clicking the Bell opens a floating dropdown showing recent notifications and relative timestamps.
  - Automatically marks notifications as read via `PATCH /api/notifications/read-all`.
  - Includes a manual "Read all" action and auto-sync polling every 15 seconds.

---

## 📡 API Endpoints Reference

---

## 🤖 AI Chatbot Assistant (HealthBot) Architecture

The chatbot assistant is exclusively mounted on the Patient Portal and runs on a decoupled, rule-based triage architecture:
1. **Config-Driven Triage (`backend/utils/chatbotIntents.js`)**:
   - Symptoms (`fever`, `chest pain`, `headache`, `knee pain`, `skin rash`, `child fever`) map dynamically to hospital clinical departments.
   - Includes FAQs for hospital operational hours (`08:00 AM - 08:00 PM`), visiting policies, and cashless TPA insurance.
   - Built to allow drop-in replacement with OpenAI/Claude API endpoints without altering routes or frontend contracts.
2. **Zero Code Duplication in Booking**:
   - Conversational scheduling directly calls `POST /api/appointments` with `source: 'chatbot'`, preserving the database transaction, pessimistic row locks, and HTTP 409 conflict checks.
3. **Strict Role Security**:
   - The widget is omitted on Admin and Doctor portals.
   - `POST /api/chatbot/message` actively rejects Admin and Doctor tokens with **HTTP 403 Forbidden**.
4. **500+ Patients/Day Scalability**:
   - Composite index on `(doctor_id, appointment_date, time_slot)` ensures O(1) slot collision lookups.
   - Stateless JWT authentication and in-memory rate limiting prevent denial-of-service and brute-force enumeration.
