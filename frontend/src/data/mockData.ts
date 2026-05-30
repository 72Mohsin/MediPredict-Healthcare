import type { Symptom, Disease, Prediction, MedicalProfile, PredictionWithRecommendation } from '@/types';

export const SYMPTOMS: Symptom[] = [
  { id: '1', name: 'Fever', category: 'General', description: 'Elevated body temperature' },
  { id: '2', name: 'Cough', category: 'Respiratory', description: 'Persistent coughing' },
  { id: '3', name: 'Shortness of Breath', category: 'Respiratory', description: 'Difficulty breathing' },
  { id: '4', name: 'Chest Pain', category: 'Cardiovascular', description: 'Pain or pressure in the chest' },
  { id: '5', name: 'Headache', category: 'Neurological', description: 'Pain in the head' },
  { id: '6', name: 'Fatigue', category: 'General', description: 'Persistent tiredness or weakness' },
  { id: '7', name: 'Nausea', category: 'Gastrointestinal', description: 'Feeling of sickness with an inclination to vomit' },
  { id: '8', name: 'Vomiting', category: 'Gastrointestinal', description: 'Forceful expulsion of stomach contents' },
  { id: '9', name: 'Diarrhea', category: 'Gastrointestinal', description: 'Loose, watery stools' },
  { id: '10', name: 'Abdominal Pain', category: 'Gastrointestinal', description: 'Pain in the belly area' },
  { id: '11', name: 'Back Pain', category: 'Musculoskeletal', description: 'Pain in the back region' },
  { id: '12', name: 'Joint Pain', category: 'Musculoskeletal', description: 'Pain in joints' },
  { id: '13', name: 'Dizziness', category: 'Neurological', description: 'Feeling of lightheadedness or vertigo' },
  { id: '14', name: 'Confusion', category: 'Neurological', description: 'Mental confusion or disorientation' },
  { id: '15', name: 'Skin Rash', category: 'Dermatological', description: 'Redness or irritation on skin' },
  { id: '16', name: 'Swelling', category: 'General', description: 'Abnormal enlargement of a body part' },
  { id: '17', name: 'Palpitations', category: 'Cardiovascular', description: 'Noticeable heartbeats or racing heart' },
  { id: '18', name: 'Sweating', category: 'General', description: 'Excessive perspiration' },
  { id: '19', name: 'Weight Loss', category: 'General', description: 'Unintentional loss of body weight' },
  { id: '20', name: 'Loss of Appetite', category: 'Gastrointestinal', description: 'Reduced desire to eat' },
  { id: '21', name: 'Sore Throat', category: 'Respiratory', description: 'Pain or irritation in the throat' },
  { id: '22', name: 'Runny Nose', category: 'Respiratory', description: 'Nasal discharge' },
  { id: '23', name: 'Muscle Pain', category: 'Musculoskeletal', description: 'Aching muscles' },
  { id: '24', name: 'Frequent Urination', category: 'Urological', description: 'Need to urinate more often than usual' },
  { id: '25', name: 'Blurred Vision', category: 'Ophthalmological', description: 'Lack of sharpness of vision' },
];

export const DISEASES: Disease[] = [
  {
    id: '1', name: 'Common Cold', category: 'Respiratory',
    description: 'Viral infection of nose and throat',
    common_symptoms: ['runny nose', 'sore throat', 'cough', 'fever', 'fatigue'],
  },
  {
    id: '2', name: 'Influenza', category: 'Respiratory',
    description: 'Contagious respiratory illness',
    common_symptoms: ['fever', 'cough', 'fatigue', 'muscle pain', 'headache', 'sweating'],
  },
  {
    id: '3', name: 'Pneumonia', category: 'Respiratory',
    description: 'Lung infection causing inflammation',
    common_symptoms: ['cough', 'fever', 'shortness of breath', 'chest pain', 'fatigue'],
  },
  {
    id: '4', name: 'Hypertension', category: 'Cardiovascular',
    description: 'High blood pressure',
    common_symptoms: ['headache', 'dizziness', 'chest pain', 'palpitations', 'sweating'],
  },
  {
    id: '5', name: 'Type 2 Diabetes', category: 'Metabolic',
    description: 'Chronic condition affecting blood sugar regulation',
    common_symptoms: ['frequent urination', 'fatigue', 'blurred vision', 'weight loss', 'sweating'],
  },
  {
    id: '6', name: 'Gastritis', category: 'Gastrointestinal',
    description: 'Inflammation of the stomach lining',
    common_symptoms: ['nausea', 'vomiting', 'abdominal pain', 'loss of appetite'],
  },
  {
    id: '7', name: 'Migraine', category: 'Neurological',
    description: 'Recurring headaches with varying intensity',
    common_symptoms: ['headache', 'nausea', 'vomiting', 'blurred vision', 'dizziness'],
  },
  {
    id: '8', name: 'Rheumatoid Arthritis', category: 'Musculoskeletal',
    description: 'Chronic inflammatory joint disease',
    common_symptoms: ['joint pain', 'swelling', 'fatigue', 'fever'],
  },
  {
    id: '9', name: 'COVID-19', category: 'Respiratory',
    description: 'Coronavirus disease',
    common_symptoms: ['fever', 'cough', 'shortness of breath', 'fatigue', 'muscle pain', 'headache', 'loss of appetite'],
  },
  {
    id: '10', name: 'Allergic Rhinitis', category: 'Respiratory',
    description: 'Allergy-induced nasal inflammation',
    common_symptoms: ['runny nose', 'sore throat', 'headache', 'fatigue'],
  },
];

// In-memory store for predictions during session
let predictionsStore: PredictionWithRecommendation[] = [];
let medicalProfilesStore: Record<string, MedicalProfile> = {};

export function savePrediction(prediction: PredictionWithRecommendation) {
  predictionsStore = [prediction, ...predictionsStore];
}

export function getPredictions(userId: string, limit = 50): Prediction[] {
  return predictionsStore
    .filter(p => p.user_id === userId)
    .slice(0, limit);
}

export function getPredictionById(id: string): PredictionWithRecommendation | null {
  return predictionsStore.find(p => p.id === id) ?? null;
}

export function saveMedicalProfile(userId: string, profile: Partial<MedicalProfile>): MedicalProfile {
  const existing = medicalProfilesStore[userId];
  const now = new Date().toISOString();
  const saved: MedicalProfile = {
    id: existing?.id ?? `profile_${Date.now()}`,
    user_id: userId,
    age: profile.age ?? null,
    gender: profile.gender ?? null,
    height: profile.height ?? null,
    weight: profile.weight ?? null,
    bmi: profile.bmi ?? null,
    existing_diseases: profile.existing_diseases ?? [],
    family_history: profile.family_history ?? [],
    smoking_status: profile.smoking_status ?? null,
    alcohol_consumption: profile.alcohol_consumption ?? null,
    exercise_habits: profile.exercise_habits ?? null,
    sleep_pattern: profile.sleep_pattern ?? null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  medicalProfilesStore[userId] = saved;
  return saved;
}

export function getMedicalProfile(userId: string): MedicalProfile | null {
  return medicalProfilesStore[userId] ?? null;
}
