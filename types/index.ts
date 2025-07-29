export interface Medication {
  id: string;
  name: string;
  dosage: string; // e.g., "500mg", "1"
  unit: string;   // e.g., "mg", "tablet(s)", "capsule(s)"
  userId: string;
  schedule: string[];
} 