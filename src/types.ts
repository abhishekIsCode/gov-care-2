export interface UserProfile {
  uid: string;
  fullName: string;
  healthId: string;
  dateOfBirth?: string;
  email: string;
  phone?: string;
  role: 'citizen' | 'doctor' | 'admin';
  specialization?: string;
  associatedHospitalId?: string;
  isVerified: boolean;
  medicalDetails?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface HealthRecord {
  id: string;
  userId: string;
  facilityName: string;
  facilityId?: string;
  doctorId?: string;
  doctorName?: string;
  date: any;
  diagnosis?: string;
  medications?: string;
  notes: string;
  type: 'Checkup' | 'Surgery' | 'Lab Result' | 'Prescription' | 'Specialist Visit';
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  facilityId: string;
  facilityName: string;
  date: any;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  diagnosisRecommendation?: string;
  reason: string;
}

export interface Facility {
  id: string;
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
}
