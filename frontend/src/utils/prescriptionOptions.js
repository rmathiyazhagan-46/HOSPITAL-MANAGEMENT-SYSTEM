/**
 * Prescription Medicine Options Configuration
 * Standardized dropdown options for Dosage, Frequency, and Duration
 * Configured centrally for easy updates without touching component code.
 */

export const DOSAGE_OPTIONS = [
  '250mg',
  '500mg',
  '650mg',
  '1000mg',
  '1 tablet',
  '2 tablets',
  '5ml',
  '10ml',
  '1 teaspoon',
  '2 teaspoons',
];

export const FREQUENCY_OPTIONS = [
  'Once a day (OD)',
  'Twice a day (BD)',
  'Thrice a day (TDS)',
  'Four times a day (QID)',
  'Every 6 hours',
  'Every 8 hours',
  'Before food',
  'After food',
  'At bedtime',
  'As needed (SOS)',
];

export const DURATION_OPTIONS = [
  '1 day',
  '3 days',
  '5 days',
  '7 days',
  '10 days',
  '14 days',
  '1 month',
  '2 months',
  '3 months',
  'Ongoing/Continuous',
];

export default {
  DOSAGE_OPTIONS,
  FREQUENCY_OPTIONS,
  DURATION_OPTIONS,
};
