export interface Medication {
  id: string;
  name: string;
  dosage: string; // e.g., "500mg", "1"
  unit: string;   // e.g., "mg", "tablet(s)", "capsule(s)"
  userId: string;
  schedule: string[];
}

export interface Dose {
  id?: string;
  medicationId: string;
  userId: string;
  actionAt?: Date; // Timestamp for when the action was taken, now optional
  scheduledTime: string;
  medicationName?: string;
  status: 'taken' | 'skipped' | 'missed'; // 'missed' is now a persistent status
}
