"""
MediPredict ML Model Trainer
Trains a Random Forest + Gradient Boosting ensemble on a comprehensive
disease-symptom dataset covering 60+ diseases and 130+ symptoms.
Run this once: python train_model.py
"""

import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.multiclass import OneVsRestClassifier

# ─────────────────────────────────────────────────────────────────────────────
# COMPREHENSIVE DISEASE-SYMPTOM DATABASE
# 65 diseases × up to 17 symptoms each
# ─────────────────────────────────────────────────────────────────────────────

DISEASE_DATA = {
    # ── CARDIOVASCULAR ────────────────────────────────────────────────────────
    "Heart Attack": {
        "category": "Cardiovascular",
        "severity": "critical",
        "symptoms": ["chest_pain", "shortness_of_breath", "sweating", "nausea", "left_arm_pain",
                     "jaw_pain", "fatigue", "dizziness", "palpitations", "anxiety",
                     "cold_hands", "back_pain", "indigestion", "vomiting"],
        "specialist": "Cardiologist",
        "emergency": True,
    },
    "Heart Failure": {
        "category": "Cardiovascular",
        "severity": "critical",
        "symptoms": ["shortness_of_breath", "fatigue", "swelling_legs", "rapid_heartbeat",
                     "persistent_cough", "weight_gain", "loss_of_appetite", "dizziness",
                     "difficulty_sleeping", "reduced_ability_to_exercise", "palpitations"],
        "specialist": "Cardiologist",
        "emergency": True,
    },
    "Hypertension": {
        "category": "Cardiovascular",
        "severity": "high",
        "symptoms": ["headache", "dizziness", "blurred_vision", "chest_pain", "shortness_of_breath",
                     "nosebleed", "palpitations", "fatigue", "confusion", "visual_changes"],
        "specialist": "Cardiologist",
        "emergency": False,
    },
    "Arrhythmia": {
        "category": "Cardiovascular",
        "severity": "high",
        "symptoms": ["palpitations", "chest_pain", "shortness_of_breath", "dizziness",
                     "fainting", "fatigue", "anxiety", "sweating", "rapid_heartbeat", "slow_heartbeat"],
        "specialist": "Cardiologist",
        "emergency": False,
    },
    "Angina": {
        "category": "Cardiovascular",
        "severity": "high",
        "symptoms": ["chest_pain", "chest_pressure", "shortness_of_breath", "fatigue",
                     "dizziness", "nausea", "sweating", "left_arm_pain", "back_pain"],
        "specialist": "Cardiologist",
        "emergency": False,
    },
    "Deep Vein Thrombosis": {
        "category": "Cardiovascular",
        "severity": "high",
        "symptoms": ["leg_pain", "swelling_legs", "warmth_in_leg", "red_skin", "cramping",
                     "skin_discoloration", "vein_visible", "fatigue"],
        "specialist": "Vascular Surgeon",
        "emergency": False,
    },

    # ── RESPIRATORY ───────────────────────────────────────────────────────────
    "Common Cold": {
        "category": "Respiratory",
        "severity": "low",
        "symptoms": ["runny_nose", "sore_throat", "cough", "sneezing", "mild_fever",
                     "congestion", "headache", "fatigue", "watery_eyes", "body_aches"],
        "specialist": "General Physician",
        "emergency": False,
    },
    "Influenza": {
        "category": "Respiratory",
        "severity": "medium",
        "symptoms": ["high_fever", "cough", "fatigue", "muscle_pain", "headache",
                     "sweating", "chills", "sore_throat", "runny_nose", "vomiting", "diarrhea"],
        "specialist": "General Physician",
        "emergency": False,
    },
    "COVID-19": {
        "category": "Respiratory",
        "severity": "high",
        "symptoms": ["fever", "cough", "shortness_of_breath", "fatigue", "loss_of_smell",
                     "loss_of_taste", "muscle_pain", "headache", "sore_throat", "diarrhea",
                     "chest_pain", "confusion", "skin_rash"],
        "specialist": "Pulmonologist",
        "emergency": False,
    },
    "Pneumonia": {
        "category": "Respiratory",
        "severity": "high",
        "symptoms": ["high_fever", "cough", "shortness_of_breath", "chest_pain", "fatigue",
                     "chills", "sweating", "nausea", "vomiting", "confusion", "rapid_breathing",
                     "bluish_lips", "muscle_pain"],
        "specialist": "Pulmonologist",
        "emergency": False,
    },
    "Asthma": {
        "category": "Respiratory",
        "severity": "medium",
        "symptoms": ["shortness_of_breath", "wheezing", "chest_tightness", "cough",
                     "difficulty_breathing", "fatigue", "anxiety", "rapid_breathing",
                     "difficulty_sleeping", "cough_at_night"],
        "specialist": "Pulmonologist",
        "emergency": False,
    },
    "Chronic Obstructive Pulmonary Disease": {
        "category": "Respiratory",
        "severity": "high",
        "symptoms": ["shortness_of_breath", "chronic_cough", "wheezing", "chest_tightness",
                     "fatigue", "frequent_respiratory_infections", "bluish_lips", "weight_loss",
                     "coughing_up_mucus", "difficulty_breathing"],
        "specialist": "Pulmonologist",
        "emergency": False,
    },
    "Tuberculosis": {
        "category": "Respiratory",
        "severity": "high",
        "symptoms": ["persistent_cough", "coughing_blood", "chest_pain", "fatigue",
                     "fever", "night_sweats", "weight_loss", "loss_of_appetite",
                     "chills", "difficulty_breathing"],
        "specialist": "Pulmonologist",
        "emergency": False,
    },
    "Allergic Rhinitis": {
        "category": "Respiratory",
        "severity": "low",
        "symptoms": ["runny_nose", "sneezing", "itchy_eyes", "congestion", "watery_eyes",
                     "itchy_nose", "postnasal_drip", "fatigue", "headache", "sore_throat"],
        "specialist": "Allergist",
        "emergency": False,
    },
    "Bronchitis": {
        "category": "Respiratory",
        "severity": "medium",
        "symptoms": ["persistent_cough", "coughing_up_mucus", "fatigue", "shortness_of_breath",
                     "mild_fever", "chest_discomfort", "wheezing", "sore_throat", "body_aches"],
        "specialist": "Pulmonologist",
        "emergency": False,
    },
    "Pulmonary Embolism": {
        "category": "Respiratory",
        "severity": "critical",
        "symptoms": ["shortness_of_breath", "chest_pain", "rapid_heartbeat", "coughing_blood",
                     "dizziness", "fainting", "sweating", "fever", "leg_swelling", "anxiety"],
        "specialist": "Pulmonologist",
        "emergency": True,
    },

    # ── LIVER ─────────────────────────────────────────────────────────────────
    "Liver Failure": {
        "category": "Hepatic",
        "severity": "critical",
        "symptoms": ["jaundice", "abdominal_pain", "nausea", "vomiting", "fatigue",
                     "confusion", "swelling_abdomen", "dark_urine", "pale_stools",
                     "easy_bruising", "bleeding", "loss_of_appetite", "itching"],
        "specialist": "Hepatologist",
        "emergency": True,
    },
    "Hepatitis A": {
        "category": "Hepatic",
        "severity": "medium",
        "symptoms": ["jaundice", "fatigue", "nausea", "vomiting", "abdominal_pain",
                     "fever", "dark_urine", "loss_of_appetite", "joint_pain", "itching"],
        "specialist": "Hepatologist",
        "emergency": False,
    },
    "Hepatitis B": {
        "category": "Hepatic",
        "severity": "high",
        "symptoms": ["jaundice", "fatigue", "abdominal_pain", "loss_of_appetite", "nausea",
                     "vomiting", "dark_urine", "joint_pain", "fever", "muscle_pain", "itching"],
        "specialist": "Hepatologist",
        "emergency": False,
    },
    "Hepatitis C": {
        "category": "Hepatic",
        "severity": "high",
        "symptoms": ["fatigue", "jaundice", "nausea", "loss_of_appetite", "abdominal_pain",
                     "dark_urine", "muscle_pain", "joint_pain", "fever", "depression"],
        "specialist": "Hepatologist",
        "emergency": False,
    },
    "Cirrhosis": {
        "category": "Hepatic",
        "severity": "critical",
        "symptoms": ["fatigue", "jaundice", "swelling_abdomen", "swelling_legs", "easy_bruising",
                     "itching", "loss_of_appetite", "nausea", "confusion", "spider_veins",
                     "redness_palms", "dark_urine", "pale_stools", "weight_loss"],
        "specialist": "Hepatologist",
        "emergency": False,
    },
    "Fatty Liver Disease": {
        "category": "Hepatic",
        "severity": "medium",
        "symptoms": ["fatigue", "abdominal_pain", "loss_of_appetite", "nausea", "weakness",
                     "weight_loss", "jaundice", "swelling_abdomen", "confusion"],
        "specialist": "Hepatologist",
        "emergency": False,
    },

    # ── KIDNEY ────────────────────────────────────────────────────────────────
    "Chronic Kidney Disease": {
        "category": "Renal",
        "severity": "critical",
        "symptoms": ["fatigue", "swelling_legs", "shortness_of_breath", "nausea", "vomiting",
                     "loss_of_appetite", "confusion", "muscle_cramps", "frequent_urination",
                     "decreased_urination", "itching", "high_blood_pressure", "anemia",
                     "back_pain", "pale_skin"],
        "specialist": "Nephrologist",
        "emergency": False,
    },
    "Acute Kidney Injury": {
        "category": "Renal",
        "severity": "critical",
        "symptoms": ["decreased_urination", "swelling_legs", "fatigue", "confusion",
                     "nausea", "vomiting", "chest_pain", "shortness_of_breath", "seizures",
                     "back_pain", "abdominal_pain"],
        "specialist": "Nephrologist",
        "emergency": True,
    },
    "Kidney Stones": {
        "category": "Renal",
        "severity": "high",
        "symptoms": ["severe_back_pain", "side_pain", "pain_urinating", "blood_in_urine",
                     "nausea", "vomiting", "frequent_urination", "fever", "chills",
                     "cloudy_urine", "foul_smelling_urine"],
        "specialist": "Urologist",
        "emergency": False,
    },
    "Urinary Tract Infection": {
        "category": "Renal",
        "severity": "medium",
        "symptoms": ["frequent_urination", "burning_urination", "cloudy_urine", "blood_in_urine",
                     "pelvic_pain", "fever", "chills", "nausea", "back_pain", "foul_smelling_urine"],
        "specialist": "Urologist",
        "emergency": False,
    },
    "Glomerulonephritis": {
        "category": "Renal",
        "severity": "high",
        "symptoms": ["blood_in_urine", "decreased_urination", "swelling_face", "swelling_legs",
                     "fatigue", "high_blood_pressure", "nausea", "back_pain", "foamy_urine"],
        "specialist": "Nephrologist",
        "emergency": False,
    },

    # ── NEUROLOGICAL ──────────────────────────────────────────────────────────
    "Stroke": {
        "category": "Neurological",
        "severity": "critical",
        "symptoms": ["sudden_numbness", "confusion", "trouble_speaking", "vision_problems",
                     "severe_headache", "dizziness", "loss_of_balance", "facial_drooping",
                     "arm_weakness", "difficulty_walking"],
        "specialist": "Neurologist",
        "emergency": True,
    },
    "Migraine": {
        "category": "Neurological",
        "severity": "medium",
        "symptoms": ["severe_headache", "nausea", "vomiting", "sensitivity_to_light",
                     "sensitivity_to_sound", "visual_aura", "throbbing_pain", "dizziness",
                     "fatigue", "neck_stiffness"],
        "specialist": "Neurologist",
        "emergency": False,
    },
    "Epilepsy": {
        "category": "Neurological",
        "severity": "high",
        "symptoms": ["seizures", "confusion", "staring_spell", "uncontrollable_movements",
                     "loss_of_consciousness", "anxiety", "deja_vu", "temporary_confusion"],
        "specialist": "Neurologist",
        "emergency": False,
    },
    "Multiple Sclerosis": {
        "category": "Neurological",
        "severity": "high",
        "symptoms": ["fatigue", "numbness", "muscle_weakness", "vision_problems", "dizziness",
                     "difficulty_walking", "tremors", "muscle_spasms", "bladder_problems",
                     "depression", "cognitive_problems", "pain"],
        "specialist": "Neurologist",
        "emergency": False,
    },
    "Parkinson's Disease": {
        "category": "Neurological",
        "severity": "high",
        "symptoms": ["tremors", "slow_movement", "rigid_muscles", "impaired_posture",
                     "balance_problems", "speech_changes", "writing_changes", "depression",
                     "sleep_problems", "constipation", "loss_of_smell"],
        "specialist": "Neurologist",
        "emergency": False,
    },
    "Meningitis": {
        "category": "Neurological",
        "severity": "critical",
        "symptoms": ["severe_headache", "high_fever", "stiff_neck", "sensitivity_to_light",
                     "nausea", "vomiting", "confusion", "seizures", "skin_rash", "fatigue"],
        "specialist": "Neurologist",
        "emergency": True,
    },

    # ── METABOLIC / ENDOCRINE ─────────────────────────────────────────────────
    "Type 1 Diabetes": {
        "category": "Endocrine",
        "severity": "high",
        "symptoms": ["frequent_urination", "extreme_thirst", "weight_loss", "fatigue",
                     "blurred_vision", "fruity_breath", "nausea", "vomiting", "abdominal_pain",
                     "slow_healing_wounds", "frequent_infections"],
        "specialist": "Endocrinologist",
        "emergency": False,
    },
    "Type 2 Diabetes": {
        "category": "Endocrine",
        "severity": "high",
        "symptoms": ["frequent_urination", "increased_thirst", "fatigue", "blurred_vision",
                     "slow_healing_wounds", "frequent_infections", "numbness_feet",
                     "weight_gain", "darkened_skin", "headache"],
        "specialist": "Endocrinologist",
        "emergency": False,
    },
    "Hypothyroidism": {
        "category": "Endocrine",
        "severity": "medium",
        "symptoms": ["fatigue", "weight_gain", "cold_intolerance", "constipation",
                     "depression", "slow_heart_rate", "dry_skin", "hair_loss", "muscle_weakness",
                     "memory_problems", "swelling_face", "hoarse_voice"],
        "specialist": "Endocrinologist",
        "emergency": False,
    },
    "Hyperthyroidism": {
        "category": "Endocrine",
        "severity": "medium",
        "symptoms": ["weight_loss", "rapid_heartbeat", "anxiety", "tremors", "sweating",
                     "heat_intolerance", "frequent_bowel_movements", "fatigue", "muscle_weakness",
                     "difficulty_sleeping", "irritability", "enlarged_thyroid"],
        "specialist": "Endocrinologist",
        "emergency": False,
    },
    "Cushing's Syndrome": {
        "category": "Endocrine",
        "severity": "high",
        "symptoms": ["weight_gain", "fatty_deposits_face", "pink_stretch_marks", "skin_thinning",
                     "easy_bruising", "slow_healing_wounds", "muscle_weakness", "fatigue",
                     "depression", "high_blood_pressure", "bone_loss", "headache"],
        "specialist": "Endocrinologist",
        "emergency": False,
    },

    # ── GASTROINTESTINAL ──────────────────────────────────────────────────────
    "Gastritis": {
        "category": "Gastrointestinal",
        "severity": "medium",
        "symptoms": ["upper_abdominal_pain", "nausea", "vomiting", "bloating", "loss_of_appetite",
                     "indigestion", "burning_stomach", "hiccups", "dark_stools", "vomiting_blood"],
        "specialist": "Gastroenterologist",
        "emergency": False,
    },
    "Peptic Ulcer": {
        "category": "Gastrointestinal",
        "severity": "medium",
        "symptoms": ["burning_stomach_pain", "nausea", "vomiting", "bloating", "heartburn",
                     "dark_stools", "vomiting_blood", "loss_of_appetite", "weight_loss",
                     "fatigue", "indigestion"],
        "specialist": "Gastroenterologist",
        "emergency": False,
    },
    "Crohn's Disease": {
        "category": "Gastrointestinal",
        "severity": "high",
        "symptoms": ["diarrhea", "abdominal_pain", "blood_in_stool", "weight_loss", "fatigue",
                     "fever", "mouth_sores", "reduced_appetite", "anal_pain", "joint_pain",
                     "skin_rash", "eye_inflammation"],
        "specialist": "Gastroenterologist",
        "emergency": False,
    },
    "Irritable Bowel Syndrome": {
        "category": "Gastrointestinal",
        "severity": "medium",
        "symptoms": ["abdominal_cramping", "bloating", "diarrhea", "constipation",
                     "mucus_in_stool", "gas", "abdominal_pain", "fatigue", "anxiety",
                     "depression", "incomplete_bowel_movement"],
        "specialist": "Gastroenterologist",
        "emergency": False,
    },
    "Appendicitis": {
        "category": "Gastrointestinal",
        "severity": "critical",
        "symptoms": ["sudden_abdominal_pain", "pain_lower_right", "nausea", "vomiting",
                     "fever", "loss_of_appetite", "bloating", "diarrhea", "constipation",
                     "inability_to_pass_gas", "rigid_abdomen"],
        "specialist": "General Surgeon",
        "emergency": True,
    },
    "Pancreatitis": {
        "category": "Gastrointestinal",
        "severity": "critical",
        "symptoms": ["severe_abdominal_pain", "back_pain", "nausea", "vomiting", "fever",
                     "rapid_pulse", "tender_abdomen", "fatty_stools", "weight_loss",
                     "jaundice", "bloating"],
        "specialist": "Gastroenterologist",
        "emergency": True,
    },
    "Gallstones": {
        "category": "Gastrointestinal",
        "severity": "high",
        "symptoms": ["upper_right_abdominal_pain", "back_pain_shoulder_blade", "nausea",
                     "vomiting", "fever", "jaundice", "clay_colored_stools", "dark_urine",
                     "indigestion", "bloating"],
        "specialist": "Gastroenterologist",
        "emergency": False,
    },
    "Celiac Disease": {
        "category": "Gastrointestinal",
        "severity": "medium",
        "symptoms": ["diarrhea", "bloating", "gas", "fatigue", "weight_loss", "anemia",
                     "bone_pain", "headache", "joint_pain", "skin_rash", "depression",
                     "numbness_hands_feet", "seizures"],
        "specialist": "Gastroenterologist",
        "emergency": False,
    },

    # ── MUSCULOSKELETAL ───────────────────────────────────────────────────────
    "Rheumatoid Arthritis": {
        "category": "Musculoskeletal",
        "severity": "high",
        "symptoms": ["joint_pain", "joint_swelling", "morning_stiffness", "fatigue",
                     "fever", "loss_of_appetite", "joint_deformity", "warmth_in_joints",
                     "rheumatoid_nodules", "dry_eyes", "dry_mouth"],
        "specialist": "Rheumatologist",
        "emergency": False,
    },
    "Osteoarthritis": {
        "category": "Musculoskeletal",
        "severity": "medium",
        "symptoms": ["joint_pain", "stiffness", "tenderness", "loss_of_flexibility",
                     "bone_spurs", "swelling", "grating_sensation", "reduced_range_of_motion"],
        "specialist": "Orthopedist",
        "emergency": False,
    },
    "Gout": {
        "category": "Musculoskeletal",
        "severity": "medium",
        "symptoms": ["severe_joint_pain", "joint_swelling", "redness_joint", "warmth_joint",
                     "limited_motion", "lingering_discomfort", "kidney_stones"],
        "specialist": "Rheumatologist",
        "emergency": False,
    },
    "Fibromyalgia": {
        "category": "Musculoskeletal",
        "severity": "medium",
        "symptoms": ["widespread_pain", "fatigue", "cognitive_problems", "sleep_problems",
                     "headache", "depression", "anxiety", "irritable_bowel", "numbness",
                     "sensitivity_to_pain", "morning_stiffness"],
        "specialist": "Rheumatologist",
        "emergency": False,
    },
    "Osteoporosis": {
        "category": "Musculoskeletal",
        "severity": "medium",
        "symptoms": ["back_pain", "loss_of_height", "stooped_posture", "bone_fracture",
                     "bone_pain", "fragile_bones"],
        "specialist": "Orthopedist",
        "emergency": False,
    },

    # ── HEMATOLOGICAL ─────────────────────────────────────────────────────────
    "Anemia": {
        "category": "Hematological",
        "severity": "medium",
        "symptoms": ["fatigue", "weakness", "pale_skin", "shortness_of_breath", "dizziness",
                     "headache", "cold_hands", "chest_pain", "rapid_heartbeat", "brittle_nails",
                     "pica", "leg_cramps"],
        "specialist": "Hematologist",
        "emergency": False,
    },
    "Leukemia": {
        "category": "Hematological",
        "severity": "critical",
        "symptoms": ["fatigue", "fever", "frequent_infections", "easy_bruising", "bleeding_gums",
                     "bone_pain", "joint_pain", "swollen_lymph_nodes", "weight_loss",
                     "night_sweats", "pale_skin", "shortness_of_breath", "petechiae"],
        "specialist": "Hematologist / Oncologist",
        "emergency": False,
    },
    "Sickle Cell Disease": {
        "category": "Hematological",
        "severity": "high",
        "symptoms": ["severe_pain", "anemia", "swelling_hands_feet", "frequent_infections",
                     "delayed_growth", "vision_problems", "fatigue", "jaundice", "pale_skin"],
        "specialist": "Hematologist",
        "emergency": False,
    },

    # ── MENTAL HEALTH ─────────────────────────────────────────────────────────
    "Depression": {
        "category": "Mental Health",
        "severity": "high",
        "symptoms": ["persistent_sadness", "loss_of_interest", "fatigue", "sleep_problems",
                     "appetite_changes", "concentration_problems", "worthlessness",
                     "irritability", "physical_aches", "social_withdrawal"],
        "specialist": "Psychiatrist",
        "emergency": False,
    },
    "Anxiety Disorder": {
        "category": "Mental Health",
        "severity": "medium",
        "symptoms": ["excessive_worry", "restlessness", "fatigue", "concentration_problems",
                     "irritability", "muscle_tension", "sleep_problems", "rapid_heartbeat",
                     "sweating", "trembling", "shortness_of_breath", "dizziness"],
        "specialist": "Psychiatrist",
        "emergency": False,
    },

    # ── INFECTIOUS ────────────────────────────────────────────────────────────
    "Dengue Fever": {
        "category": "Infectious",
        "severity": "high",
        "symptoms": ["high_fever", "severe_headache", "eye_pain", "joint_pain", "muscle_pain",
                     "skin_rash", "mild_bleeding", "nausea", "vomiting", "fatigue",
                     "swollen_lymph_nodes"],
        "specialist": "Infectious Disease Specialist",
        "emergency": False,
    },
    "Malaria": {
        "category": "Infectious",
        "severity": "high",
        "symptoms": ["high_fever", "chills", "sweating", "headache", "nausea", "vomiting",
                     "muscle_pain", "fatigue", "jaundice", "anemia", "diarrhea", "rapid_breathing"],
        "specialist": "Infectious Disease Specialist",
        "emergency": False,
    },
    "Typhoid": {
        "category": "Infectious",
        "severity": "high",
        "symptoms": ["high_fever", "headache", "abdominal_pain", "constipation", "diarrhea",
                     "rose_spots_rash", "fatigue", "loss_of_appetite", "nausea", "vomiting",
                     "enlarged_spleen", "enlarged_liver"],
        "specialist": "Infectious Disease Specialist",
        "emergency": False,
    },
    "HIV/AIDS": {
        "category": "Infectious",
        "severity": "critical",
        "symptoms": ["fatigue", "fever", "swollen_lymph_nodes", "night_sweats", "weight_loss",
                     "frequent_infections", "mouth_sores", "skin_rash", "diarrhea",
                     "muscle_aches", "sore_throat", "headache"],
        "specialist": "Infectious Disease Specialist",
        "emergency": False,
    },

    # ── SKIN ──────────────────────────────────────────────────────────────────
    "Psoriasis": {
        "category": "Dermatological",
        "severity": "medium",
        "symptoms": ["red_patches_skin", "silver_scales", "dry_cracked_skin", "itching",
                     "burning_skin", "thickened_nails", "joint_swelling", "joint_stiffness"],
        "specialist": "Dermatologist",
        "emergency": False,
    },
    "Eczema": {
        "category": "Dermatological",
        "severity": "low",
        "symptoms": ["itching", "dry_skin", "red_rash", "skin_inflammation", "scaly_skin",
                     "blisters", "crusting_skin", "swelling", "skin_thickening"],
        "specialist": "Dermatologist",
        "emergency": False,
    },
    "Chickenpox": {
        "category": "Dermatological",
        "severity": "medium",
        "symptoms": ["itchy_blisters", "fever", "fatigue", "loss_of_appetite", "headache",
                     "red_spots", "fluid_filled_blisters", "scabs", "sore_throat"],
        "specialist": "General Physician",
        "emergency": False,
    },

    # ── CANCER (early warning signs) ──────────────────────────────────────────
    "Lung Cancer": {
        "category": "Oncological",
        "severity": "critical",
        "symptoms": ["persistent_cough", "coughing_blood", "shortness_of_breath", "chest_pain",
                     "hoarse_voice", "weight_loss", "fatigue", "bone_pain", "headache",
                     "wheezing", "recurrent_pneumonia", "loss_of_appetite"],
        "specialist": "Oncologist",
        "emergency": False,
    },
    "Colorectal Cancer": {
        "category": "Oncological",
        "severity": "critical",
        "symptoms": ["blood_in_stool", "change_in_bowel_habits", "abdominal_pain", "fatigue",
                     "weight_loss", "nausea", "vomiting", "bloating", "iron_deficiency_anemia",
                     "narrow_stools", "feeling_incomplete_bowel"],
        "specialist": "Oncologist",
        "emergency": False,
    },
    "Breast Cancer": {
        "category": "Oncological",
        "severity": "critical",
        "symptoms": ["breast_lump", "breast_pain", "nipple_discharge", "skin_dimpling",
                     "swollen_lymph_nodes_armpit", "breast_skin_changes", "nipple_retraction",
                     "redness_breast", "swelling_breast"],
        "specialist": "Oncologist",
        "emergency": False,
    },

    # ── AUTOIMMUNE ────────────────────────────────────────────────────────────
    "Lupus": {
        "category": "Autoimmune",
        "severity": "high",
        "symptoms": ["butterfly_rash", "fatigue", "fever", "joint_pain", "joint_swelling",
                     "skin_lesions", "shortness_of_breath", "chest_pain", "dry_eyes",
                     "headache", "confusion", "hair_loss", "raynauds_phenomenon"],
        "specialist": "Rheumatologist",
        "emergency": False,
    },

    # ── PEDIATRIC / OTHER ─────────────────────────────────────────────────────
    "Measles": {
        "category": "Infectious",
        "severity": "high",
        "symptoms": ["high_fever", "cough", "runny_nose", "red_eyes", "skin_rash",
                     "koplik_spots", "sore_throat", "sensitivity_to_light", "muscle_pain"],
        "specialist": "General Physician",
        "emergency": False,
    },
    "Mumps": {
        "category": "Infectious",
        "severity": "medium",
        "symptoms": ["swollen_salivary_glands", "fever", "headache", "muscle_aches",
                     "fatigue", "loss_of_appetite", "jaw_pain", "difficulty_chewing"],
        "specialist": "General Physician",
        "emergency": False,
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Extract all unique symptoms
# ─────────────────────────────────────────────────────────────────────────────
all_symptoms = sorted(set(
    symptom
    for disease_info in DISEASE_DATA.values()
    for symptom in disease_info["symptoms"]
))

print(f"Total diseases: {len(DISEASE_DATA)}")
print(f"Total unique symptoms: {len(all_symptoms)}")

# ─────────────────────────────────────────────────────────────────────────────
# Build training dataset with augmentation
# ─────────────────────────────────────────────────────────────────────────────
np.random.seed(42)

rows = []
labels = []

for disease_name, info in DISEASE_DATA.items():
    disease_symptoms = info["symptoms"]
    n_symptoms = len(disease_symptoms)

    # Generate many samples per disease with realistic variation
    for _ in range(150):
        row = [0] * len(all_symptoms)

        # Always include 60-90% of core symptoms
        n_core = max(2, int(n_symptoms * np.random.uniform(0.6, 0.95)))
        selected = np.random.choice(disease_symptoms, size=min(n_core, n_symptoms), replace=False)

        for s in selected:
            idx = all_symptoms.index(s)
            row[idx] = 1

        # Add 0-3 noise symptoms from other diseases
        n_noise = np.random.randint(0, 4)
        if n_noise > 0:
            other_symptoms = [s for s in all_symptoms if s not in disease_symptoms]
            noise_symptoms = np.random.choice(other_symptoms, size=min(n_noise, len(other_symptoms)), replace=False)
            for s in noise_symptoms:
                idx = all_symptoms.index(s)
                row[idx] = 1

        rows.append(row)
        labels.append(disease_name)

X = np.array(rows)
y = np.array(labels)

print(f"\nTraining samples: {len(X)}")
print(f"Feature count: {X.shape[1]}")

# ─────────────────────────────────────────────────────────────────────────────
# Train model
# ─────────────────────────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print("\nTraining Random Forest + Gradient Boosting ensemble...")

rf = RandomForestClassifier(
    n_estimators=200,
    max_depth=20,
    min_samples_split=3,
    min_samples_leaf=1,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1,
)

from sklearn.ensemble import GradientBoostingClassifier
gb = GradientBoostingClassifier(
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1,
    random_state=42,
)

# Train both
rf.fit(X_train, y_train)
gb.fit(X_train, y_train)

# Evaluate
rf_acc = accuracy_score(y_test, rf.predict(X_test))
gb_acc = accuracy_score(y_test, gb.predict(X_test))
print(f"Random Forest accuracy: {rf_acc:.1%}")
print(f"Gradient Boosting accuracy: {gb_acc:.1%}")

# Use RF as primary (faster inference), GB as secondary
# ─────────────────────────────────────────────────────────────────────────────
# Save artifacts
# ─────────────────────────────────────────────────────────────────────────────
joblib.dump(rf, "ml_model.pkl")
joblib.dump(gb, "ml_model_gb.pkl")

# Save symptom list and disease metadata
with open("ml_metadata.json", "w") as f:
    json.dump({
        "symptoms": all_symptoms,
        "diseases": {
            name: {
                "category": info["category"],
                "severity": info["severity"],
                "specialist": info["specialist"],
                "emergency": info["emergency"],
            }
            for name, info in DISEASE_DATA.items()
        }
    }, f, indent=2)

# Save home remedies by category
HOME_REMEDIES = {
    "Cardiovascular": [
        "Limit sodium intake — avoid processed and salty foods",
        "Practice slow deep breathing exercises (4-7-8 technique) for 10 minutes daily",
        "Avoid caffeine and alcohol temporarily",
        "Sit or lie down immediately if feeling chest discomfort",
        "Stay calm and avoid physical exertion until evaluated",
    ],
    "Respiratory": [
        "Steam inhalation with eucalyptus oil twice daily",
        "Honey and ginger tea to soothe throat and reduce cough",
        "Stay well-hydrated with warm fluids (soups, herbal teas)",
        "Use a humidifier to keep air moist",
        "Elevate head while sleeping to ease breathing",
        "Avoid smoke, dust and air pollutants",
        "Saline nasal rinse to clear congestion",
    ],
    "Hepatic": [
        "Avoid all alcohol completely",
        "Stay hydrated with water and clear fluids",
        "Eat small, light meals — avoid fatty and fried foods",
        "Rest as much as possible",
        "Avoid paracetamol/acetaminophen which stresses the liver",
        "Milk thistle tea may support liver health (consult doctor first)",
    ],
    "Renal": [
        "Drink plenty of water (8-10 glasses/day) to flush kidneys",
        "Reduce protein and sodium intake temporarily",
        "Cranberry juice (unsweetened) may help prevent UTIs",
        "Warm compress on lower back for pain relief",
        "Avoid NSAIDs (ibuprofen, naproxen) which harm kidneys",
        "Monitor fluid intake and output",
    ],
    "Neurological": [
        "Rest in a dark, quiet room",
        "Apply cold or warm compress to forehead and neck",
        "Peppermint oil massage on temples for headache relief",
        "Stay hydrated — dehydration worsens neurological symptoms",
        "Avoid screen time and bright lights during episodes",
        "Ginger tea for nausea associated with migraines",
    ],
    "Endocrine": [
        "Monitor blood sugar levels regularly if diabetic",
        "Eat low-glycemic foods (whole grains, vegetables, legumes)",
        "Stay physically active with light walks after meals",
        "Avoid sugary drinks and processed carbohydrates",
        "Fenugreek seeds soaked overnight may help regulate blood sugar",
        "Maintain consistent meal times",
    ],
    "Gastrointestinal": [
        "Eat small, frequent meals every 2-3 hours",
        "Ginger tea or peppermint tea for nausea and bloating",
        "BRAT diet: Bananas, Rice, Applesauce, Toast for upset stomach",
        "Avoid spicy, fatty, or acidic foods",
        "Stay hydrated with clear fluids and ORS (oral rehydration solution)",
        "Probiotics (yogurt, kefir) support gut health",
        "Chamomile tea reduces inflammation and soothes stomach",
    ],
    "Musculoskeletal": [
        "Apply warm compress to stiff joints in the morning",
        "Cold compress for acute swelling and inflammation",
        "Gentle stretching exercises twice daily",
        "Turmeric milk (golden milk) has anti-inflammatory properties",
        "Omega-3 rich foods (fish, walnuts, flaxseed) reduce inflammation",
        "Epsom salt bath soothes muscle and joint pain",
        "Avoid prolonged sitting — take breaks every 30 minutes",
    ],
    "Hematological": [
        "Eat iron-rich foods: spinach, lentils, red meat, fortified cereals",
        "Pair iron foods with Vitamin C (orange juice, tomatoes) for absorption",
        "Avoid tea/coffee immediately after meals — reduces iron absorption",
        "Get adequate rest and avoid overexertion",
        "Vitamin B12 rich foods: eggs, dairy, meat",
    ],
    "Mental Health": [
        "Practice mindfulness meditation for 10-15 minutes daily",
        "Maintain a consistent sleep schedule (7-9 hours)",
        "Regular physical exercise releases endorphins",
        "Limit alcohol and caffeine which worsen anxiety and depression",
        "Journaling can help process difficult emotions",
        "Social connection — speak to a trusted friend or family member",
        "Lavender aromatherapy may reduce anxiety",
    ],
    "Infectious": [
        "Rest as much as possible to allow immune recovery",
        "Stay hydrated with water, coconut water, and broths",
        "Honey and lemon in warm water for immune support",
        "Vitamin C rich foods: citrus fruits, bell peppers, kiwi",
        "Cool sponge baths for high fever",
        "Use paracetamol for fever as directed on packaging",
        "Isolate to avoid spreading infection to others",
    ],
    "Dermatological": [
        "Apply aloe vera gel to soothe inflamed skin",
        "Use fragrance-free, gentle moisturizers twice daily",
        "Oatmeal baths reduce itching and inflammation",
        "Avoid scratching — keep nails trimmed short",
        "Wear loose, breathable cotton clothing",
        "Avoid known triggers (certain soaps, foods, fabrics)",
        "Cool compress for immediate itch relief",
    ],
    "Oncological": [
        "Eat an anti-inflammatory diet rich in fruits and vegetables",
        "Stay hydrated and maintain nutrition",
        "Light exercise as tolerated helps manage fatigue",
        "Join a support group for emotional wellbeing",
        "Get adequate rest — fatigue is common",
        "Seek palliative care support alongside treatment",
    ],
    "Autoimmune": [
        "Avoid known triggers (sun exposure for lupus, gluten for celiac)",
        "Anti-inflammatory diet: turmeric, ginger, omega-3 rich foods",
        "Stress management — meditation, yoga, breathing exercises",
        "Get adequate sleep — 8-9 hours during flares",
        "Gentle exercise like swimming or walking",
        "Keep a symptom diary to identify flare triggers",
    ],
}

with open("home_remedies.json", "w") as f:
    json.dump(HOME_REMEDIES, f, indent=2)

print("\n✅ Model training complete!")
print("Files saved:")
print("  - ml_model.pkl (Random Forest)")
print("  - ml_model_gb.pkl (Gradient Boosting)")
print("  - ml_metadata.json (symptoms + disease info)")
print("  - home_remedies.json (remedies by category)")
print(f"\nModel covers {len(DISEASE_DATA)} diseases and {len(all_symptoms)} symptoms")
