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
  actionAt: Date; // Timestamp for when the action was taken
  scheduledTime: string;
  medicationName?: string;
  status: 'taken' | 'skipped'; // New status field
}
