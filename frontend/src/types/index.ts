export type UserRole = 'user' | 'admin';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

export interface MedicalProfile {
  id: string;
  user_id: string;
  age: number | null;
  gender: string | null;
  height: number | null;
  weight: number | null;
  bmi: number | null;
  existing_diseases: string[] | null;
  family_history: string[] | null;
  smoking_status: string | null;
  alcohol_consumption: string | null;
  exercise_habits: string | null;
  sleep_pattern: string | null;
  created_at: string;
  updated_at: string;
}

export interface Symptom {
  id: string;
  name: string;
  category: string;
  description: string | null;
}

export interface Disease {
  id: string;
  name: string;
  description: string | null;
  category: string;
  common_symptoms: string[] | null;
}

export interface PredictedDisease {
  disease_name: string;
  probability: number;
  risk_level: RiskLevel;
}

export interface Vitals {
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  blood_sugar?: number;
  cholesterol?: number;
  heart_rate?: number;
  temperature?: number;
}

export interface Prediction {
  id: string;
  user_id: string;
  symptoms: string[];
  vitals: Vitals | null;
  predicted_diseases: PredictedDisease[];
  risk_level: RiskLevel;
  confidence_score: number;
  reasoning: string | null;
  created_at: string;
}

export interface Recommendation {
  id: string;
  prediction_id: string;
  recommended_tests: string[] | null;
  doctor_specialties: string[] | null;
  immediate_actions: string[] | null;
  emergency_warning: boolean;
  emergency_message: string | null;
  created_at: string;
}

export interface PredictionWithRecommendation extends Prediction {
  recommendations?: Recommendation;
}
