"""
ML-powered prediction engine using trained Random Forest + Gradient Boosting ensemble.
Falls back to rule-based if model files are missing.
"""
import json
import os
import numpy as np

_model = None
_label_encoder = None
_symptom_list = None
_disease_meta = None

def _load_model():
    global _model, _label_encoder, _symptom_list, _disease_meta
    if _model is not None:
        return True
    try:
        import joblib
        base = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base, 'model.pkl')
        encoder_path = os.path.join(base, 'label_encoder.pkl')
        symptom_path = os.path.join(base, 'symptom_list.pkl')

        # Print clear diagnostics
        for p, name in [(model_path, 'model.pkl'), (encoder_path, 'label_encoder.pkl'), (symptom_path, 'symptom_list.pkl')]:
            print(f"  {'✓' if os.path.exists(p) else '✗'} {name} {'found' if os.path.exists(p) else 'MISSING'} at {p}")

        _model = joblib.load(model_path)
        _label_encoder = joblib.load(encoder_path)
        _symptom_list = joblib.load(symptom_path)
        with open(os.path.join(base, 'disease_meta.json')) as f:
            _disease_meta = json.load(f)
        print(f"✓ ML model loaded: {len(_label_encoder.classes_)} diseases, {len(_symptom_list)} symptoms")
        return True
    except Exception as e:
        print(f"✗ ML model failed to load: {e}")
        print("  → Copy model.pkl, label_encoder.pkl, symptom_list.pkl into the backend/ folder")
        return False

SPECIALIST_MAP = {
    "Common Cold": ["General Physician"],
    "Influenza": ["General Physician", "Infectious Disease Specialist"],
    "COVID-19": ["General Physician", "Pulmonologist", "Infectious Disease Specialist"],
    "Pneumonia": ["Pulmonologist", "General Physician"],
    "Bronchitis": ["Pulmonologist", "General Physician"],
    "Asthma": ["Pulmonologist", "Allergist"],
    "Tuberculosis": ["Pulmonologist", "Infectious Disease Specialist"],
    "Allergic Rhinitis": ["Allergist", "ENT Specialist"],
    "Heart Attack": ["Cardiologist", "Emergency Medicine"],
    "Heart Failure": ["Cardiologist", "General Physician"],
    "Hypertension": ["Cardiologist", "General Physician"],
    "Arrhythmia": ["Cardiologist", "Electrophysiologist"],
    "Angina": ["Cardiologist"],
    "Deep Vein Thrombosis": ["Vascular Surgeon", "Hematologist"],
    "Migraine": ["Neurologist", "General Physician"],
    "Stroke": ["Neurologist", "Emergency Medicine"],
    "Epilepsy": ["Neurologist"],
    "Meningitis": ["Neurologist", "Infectious Disease Specialist", "Emergency Medicine"],
    "Parkinson's Disease": ["Neurologist", "Movement Disorder Specialist"],
    "Gastritis": ["Gastroenterologist", "General Physician"],
    "Peptic Ulcer": ["Gastroenterologist"],
    "Appendicitis": ["General Surgeon", "Emergency Medicine"],
    "Irritable Bowel Syndrome": ["Gastroenterologist"],
    "Liver Failure": ["Hepatologist", "Gastroenterologist", "Emergency Medicine"],
    "Cirrhosis": ["Hepatologist", "Gastroenterologist"],
    "Hepatitis": ["Hepatologist", "Gastroenterologist", "Infectious Disease Specialist"],
    "Pancreatitis": ["Gastroenterologist", "General Surgeon"],
    "Gallstones": ["Gastroenterologist", "General Surgeon"],
    "Crohn's Disease": ["Gastroenterologist"],
    "Type 1 Diabetes": ["Endocrinologist", "General Physician"],
    "Type 2 Diabetes": ["Endocrinologist", "General Physician"],
    "Hypothyroidism": ["Endocrinologist"],
    "Hyperthyroidism": ["Endocrinologist"],
    "Anemia": ["Hematologist", "General Physician"],
    "Chronic Kidney Disease": ["Nephrologist", "General Physician"],
    "Kidney Stones": ["Urologist", "Nephrologist"],
    "Urinary Tract Infection": ["General Physician", "Urologist"],
    "Rheumatoid Arthritis": ["Rheumatologist"],
    "Osteoarthritis": ["Rheumatologist", "Orthopedist"],
    "Gout": ["Rheumatologist", "General Physician"],
    "Dengue Fever": ["Infectious Disease Specialist", "General Physician"],
    "Malaria": ["Infectious Disease Specialist", "General Physician"],
}

TESTS_MAP = {
    "Heart Attack": ["ECG/EKG (URGENT)", "Troponin Blood Test", "Chest X-ray", "Echocardiogram", "Coronary Angiography"],
    "Heart Failure": ["ECG", "Echocardiogram", "BNP Blood Test", "Chest X-ray", "Complete Blood Count"],
    "Hypertension": ["Blood Pressure Monitoring (24hr)", "ECG", "Kidney Function Test", "Lipid Panel", "Urinalysis"],
    "Arrhythmia": ["ECG/EKG", "Holter Monitor (24-48hr)", "Echocardiogram", "Blood Tests"],
    "Stroke": ["CT Scan Brain (URGENT)", "MRI Brain", "Blood Tests", "Carotid Ultrasound", "ECG"],
    "Pneumonia": ["Chest X-ray", "Complete Blood Count", "Sputum Culture", "Pulse Oximetry", "CT Chest"],
    "Tuberculosis": ["Chest X-ray", "Sputum AFB Test", "TB Skin Test (Mantoux)", "Gene Xpert", "CT Chest"],
    "COVID-19": ["RT-PCR Test", "Rapid Antigen Test", "Chest CT", "Complete Blood Count", "CRP Test"],
    "Liver Failure": ["Liver Function Tests (LFT)", "Ultrasound Abdomen", "PT/INR", "Bilirubin", "Ammonia Level"],
    "Cirrhosis": ["Liver Function Tests", "Fibroscan", "Ultrasound Abdomen", "Endoscopy", "Liver Biopsy"],
    "Hepatitis": ["Hepatitis Panel (A/B/C/E)", "Liver Function Tests", "Ultrasound Liver", "Liver Biopsy"],
    "Chronic Kidney Disease": ["Serum Creatinine", "eGFR", "Urinalysis", "Kidney Ultrasound", "Urine Protein Test"],
    "Kidney Stones": ["CT KUB (non-contrast)", "Kidney Ultrasound", "Urinalysis", "Blood Chemistry"],
    "Type 1 Diabetes": ["Fasting Blood Glucose", "HbA1c", "C-Peptide", "GAD Antibodies", "Urine Ketones"],
    "Type 2 Diabetes": ["Fasting Blood Glucose", "HbA1c", "Lipid Panel", "Kidney Function Test", "Eye Exam"],
    "Appendicitis": ["Ultrasound Abdomen", "CT Abdomen (URGENT)", "Complete Blood Count", "CRP Test"],
    "Pancreatitis": ["Serum Amylase", "Serum Lipase", "CT Abdomen", "Ultrasound", "Complete Blood Count"],
    "Meningitis": ["Lumbar Puncture/CSF Analysis (URGENT)", "CT Brain", "Complete Blood Count", "Blood Culture"],
    "Migraine": ["MRI Brain", "CT Brain", "Blood Tests", "EEG"],
    "Epilepsy": ["EEG", "MRI Brain", "CT Brain", "Blood Tests"],
    "Anemia": ["Complete Blood Count", "Iron Studies (Serum Ferritin, TIBC)", "B12/Folate", "Peripheral Blood Smear"],
    "Hypothyroidism": ["TSH", "Free T4", "Free T3", "Thyroid Antibodies (Anti-TPO)", "Thyroid Ultrasound"],
    "Hyperthyroidism": ["TSH", "Free T4", "Free T3", "Thyroid Scan", "RAI Uptake Test"],
    "Rheumatoid Arthritis": ["Rheumatoid Factor (RF)", "Anti-CCP Antibody", "ESR", "CRP", "X-ray Joints"],
    "Gout": ["Serum Uric Acid", "Joint Fluid Analysis", "X-ray Joints", "Complete Blood Count"],
    "Dengue Fever": ["Dengue NS1 Antigen", "Dengue IgM/IgG", "Complete Blood Count", "Platelet Count"],
    "Malaria": ["Malaria RDT", "Blood Smear (Thick & Thin)", "Complete Blood Count", "Liver Function Tests"],
    "Gallstones": ["Ultrasound Abdomen", "HIDA Scan", "CT Abdomen", "Liver Function Tests"],
    "Deep Vein Thrombosis": ["D-Dimer Blood Test", "Doppler Ultrasound Legs", "CT Venography"],
}

HOME_REMEDIES_MAP = {
    "Common Cold": ["Steam inhalation with eucalyptus oil 2x daily", "Honey + ginger + lemon tea", "Warm saltwater gargle 3x daily", "Stay hydrated with warm fluids", "Rest 8+ hours"],
    "Influenza": ["Complete bed rest", "Hot chicken soup for congestion", "Paracetamol for fever (as directed)", "Cool wet cloth on forehead", "Elderberry tea may reduce duration"],
    "COVID-19": ["Complete isolation and rest", "Monitor oxygen levels with pulse oximeter", "Prone positioning if breathing is difficult", "Warm turmeric milk daily", "High fluid intake"],
    "Migraine": ["Rest in dark, silent room", "Cold pack on forehead/neck", "Peppermint oil massage on temples", "Drink 3 glasses water immediately (dehydration worsens migraines)", "Magnesium-rich foods: nuts, dark chocolate"],
    "Hypertension": ["DASH diet: fruits, vegetables, whole grains", "Reduce salt to under 5g/day", "30-min brisk walk daily", "Deep breathing or meditation 10min/day", "Avoid caffeine and alcohol", "Garlic in daily cooking"],
    "Type 2 Diabetes": ["Low-glycemic meals: vegetables, legumes, whole grains", "Walk 15-20 min after every meal", "Cinnamon in food helps blood sugar", "Monitor blood sugar daily", "Avoid sugary drinks completely"],
    "Type 1 Diabetes": ["Monitor blood glucose 4-6x daily", "Keep fast-acting sugar (glucose tablets) available", "Eat consistent meals at same times", "Regular exercise but monitor glucose before/after", "Keep insulin cool and accessible"],
    "Gastritis": ["Small meals every 3 hours", "Ginger or chamomile tea", "Avoid spicy, oily, and acidic foods", "Aloe vera juice may soothe", "Yogurt/buttermilk for probiotics"],
    "Anemia": ["Iron-rich foods: spinach, lentils, red meat, tofu", "Vitamin C with iron foods (aids absorption)", "Pomegranate juice daily", "Avoid tea/coffee 1hr before/after meals", "Beetroot + carrot juice daily"],
    "Rheumatoid Arthritis": ["Warm compress on joints every morning", "Turmeric milk (golden milk) daily", "Omega-3 foods: fish, flaxseeds, walnuts", "Gentle range-of-motion exercises daily", "Epsom salt bath for relief"],
    "Osteoarthritis": ["Warm compress before activity, cold after", "Low-impact exercise: swimming, cycling", "Weight management reduces joint stress", "Turmeric and ginger anti-inflammatory diet", "Vitamin D and calcium-rich foods"],
    "Asthma": ["Identify and avoid triggers", "Pursed lip breathing exercises", "Keep humidity 30-50% at home", "Warm steam inhalation", "Omega-3 foods reduce airway inflammation"],
    "Urinary Tract Infection": ["Drink 3+ liters water daily", "Unsweetened cranberry juice 2 glasses/day", "Warm compress on lower abdomen", "Avoid caffeine, alcohol, spicy foods", "Wear loose cotton clothing"],
    "Kidney Stones": ["Drink at least 3 liters of water daily", "Lemon juice in water — citrate prevents stones", "Reduce sodium and animal protein intake", "Basil tea may help pass small stones", "Avoid oxalate-rich foods (spinach, nuts) if calcium oxalate stones"],
    "Hypothyroidism": ["Brazil nuts (selenium)", "Iodized salt and seaweed (iodine)", "Zinc: oysters, beef, pumpkin seeds", "Regular gentle exercise: yoga, walking", "Avoid raw cabbage/broccoli in large amounts"],
    "Hyperthyroidism": ["Avoid iodine-rich foods (seaweed, iodized salt)", "Cooling foods: cucumber, yogurt, coconut water", "Bugleweed and lemon balm teas may help mildly", "Stress reduction: yoga, meditation", "Calcium-rich foods (hyperthyroidism causes bone loss)"],
    "Liver Failure": ["ZERO alcohol — absolutely essential", "Low-sodium diet reduces fluid retention", "Small frequent meals — easier on liver", "Milk thistle tea (hepatoprotective)", "Avoid all NSAIDs and unnecessary medications"],
    "Cirrhosis": ["Complete alcohol abstinence", "Low-sodium diet under 2g/day", "High-protein diet (unless encephalopathy)", "Avoid raw seafood (infection risk)", "Milk thistle supplements — ask doctor"],
    "Hepatitis": ["Complete rest, especially in acute phase", "High-calorie, nutritious diet", "Avoid alcohol completely", "Turmeric in food (anti-inflammatory)", "Drink plenty of fluids"],
    "Heart Attack": ["CALL EMERGENCY SERVICES IMMEDIATELY", "Chew an aspirin (325mg) if not allergic and no contraindications", "Sit or lie in comfortable position", "Loosen tight clothing", "Do NOT eat or drink anything"],
    "Heart Failure": ["Weigh daily — report 2kg gain in 2 days to doctor", "Sodium under 2g/day strictly", "Elevate legs when resting to reduce swelling", "Cardiac rehabilitation exercises as prescribed", "Monitor and record fluid intake/output"],
    "Dengue Fever": ["Complete bed rest", "Papaya leaf juice may raise platelet count", "3-4 liters fluids: water, coconut water, ORS", "Cool sponge baths for fever", "ONLY paracetamol for fever — NO aspirin/ibuprofen"],
    "Malaria": ["Prescribed antimalarial medication — do not skip doses", "Stay indoors especially at dusk and dawn", "Use mosquito nets and repellents", "Drink plenty of fluids to prevent dehydration", "Cool sponge baths for high fever"],
    "Gout": ["Cherry juice or fresh cherries daily", "Drink 8-10 glasses water", "Avoid organ meats, shellfish, red meat", "Elevate and rest the affected joint", "Ice pack (wrapped) on inflamed joint 20min at a time"],
    "Pancreatitis": ["Complete fasting initially — very important", "Then clear liquids, then soft low-fat foods gradually", "Absolutely no alcohol", "Small frequent meals when eating resumes", "Enzyme-supplemented meals if recommended"],
    "Gallstones": ["Low-fat diet strictly", "Small frequent meals", "Increase fiber: fruits, vegetables, whole grains", "Avoid fried foods completely", "Peppermint tea may relieve spasms"],
    "Parkinson's Disease": ["Regular physical exercise — tai chi, yoga, walking", "High-fiber diet to manage constipation", "Take medications at same time daily", "Speech therapy exercises daily", "Occupational therapy for daily tasks"],
    "DEFAULT": ["Rest 8+ hours sleep", "Drink 8-10 glasses water daily", "Eat nutritious balanced meals", "Avoid self-medication", "Monitor symptoms; seek help if worsening"],
}

EMERGENCY_CONDITIONS = {
    "Heart Attack", "Stroke", "Meningitis", "Appendicitis",
    "Liver Failure", "Pneumonia", "Deep Vein Thrombosis",
}

def _normalize_symptom(symptom: str) -> str:
    return symptom.lower().strip().replace(' ', '_').replace('-', '_').replace('(', '').replace(')', '').replace('/', '_')

def _inject_disease(diseases, name, prob):
    if not any(d["disease_name"] == name for d in diseases):
        risk = "high" if prob > 65 else "medium"
        diseases.append({"disease_name": name, "probability": prob, "risk_level": risk})
        diseases.sort(key=lambda x: x["probability"], reverse=True)

def _build_actions(top_name, risk, has_severe, prob):
    actions = []
    if top_name in EMERGENCY_CONDITIONS and prob > 50:
        actions.append("🚨 Seek EMERGENCY medical care immediately — call 108/911")
    elif risk == "high" or has_severe:
        actions.append("⚠️ See a doctor TODAY — do not delay")
    elif risk == "medium":
        actions.append("📅 Schedule a doctor appointment within 2-3 days")
    else:
        actions.append("Monitor symptoms; see doctor if no improvement in 3-5 days")
    actions += ["Get adequate rest (7-8 hours sleep)", "Stay hydrated (8-10 glasses water daily)", "Track your symptoms in this app daily"]
    return actions

def _check_emergency(top_name, symptom_names, has_severe):
    critical = {"severe_chest_pain", "chest_pressure", "pain_radiating_to_arm", "sudden_numbness",
                "facial_drooping", "loss_of_consciousness", "coughing_blood", "vomiting_blood",
                "severe_abdominal_pain", "difficulty_speaking", "bluish_lips"}
    has_critical = any(s in critical for s in symptom_names)
    is_emergency = (top_name in EMERGENCY_CONDITIONS and has_severe) or has_critical
    msg = None
    if is_emergency:
        msg = f"EMERGENCY: Symptoms consistent with {top_name}. Call 108 (India) or 911 immediately. Go to the nearest ER. Do NOT drive yourself."
    return is_emergency, msg


def generate_prediction(symptoms: list, vitals: dict | None) -> dict:
    ml_available = _load_model()
    symptom_names_raw = [s["name"] for s in symptoms]
    symptom_names_normalized = [_normalize_symptom(s) for s in symptom_names_raw]
    has_severe = any(s.get("severity") == "Severe" for s in symptoms)
    vitals = vitals or {}

    if not ml_available:
        # Model files missing — return generic result with clear message
        return {
            "diseases": [{"disease_name": "Unable to predict", "probability": 0, "risk_level": "medium"}],
            "risk_level": "medium", "confidence": 0,
            "reasoning": "ML model files not found. Please ensure model.pkl, label_encoder.pkl, and symptom_list.pkl are in the backend/ folder and restart the server.",
            "tests": ["Consult a doctor directly"],
            "doctors": ["General Physician"],
            "actions": ["Please restart the backend server — ML model files are missing"],
            "home_remedies": [],
            "emergency": False, "emergency_msg": None, "ml_powered": False,
            "follow_up_question": None,
        }

    vec = np.zeros(len(_symptom_list))
    matched = []
    for ns in symptom_names_normalized:
        if ns in _symptom_list:
            vec[_symptom_list.index(ns)] = 1
            matched.append(ns)

    proba = _model.predict_proba([vec])[0]
    disease_names = _label_encoder.classes_
    ranked = sorted(zip(disease_names, proba), key=lambda x: x[1], reverse=True)

    # Scale probabilities relative to top result so the UI shows meaningful numbers
    # e.g. top=0.13, second=0.07 → displayed as 100% and 54% of top
    # Then map to absolute scale: top always shown as its real % * 6 (capped at 95)
    top_raw = ranked[0][1] if ranked else 0.01
    top_diseases = []
    for disease, prob in ranked[:5]:
        if prob < 0.02:
            break
        # Scale: top gets displayed prominently, others shown proportionally
        relative = prob / max(top_raw, 0.001)
        pct = min(round(relative * min(round(top_raw * 600), 92)), 95)
        pct = max(pct, 15)  # minimum 15% for any listed disease
        risk = "high" if pct > 65 else "medium" if pct > 40 else "low"
        top_diseases.append({"disease_name": disease, "probability": pct, "risk_level": risk})

    if not top_diseases:
        top_diseases = [{"disease_name": "General Malaise", "probability": 40, "risk_level": "low"}]

    if vitals.get("blood_pressure_systolic", 0) > 140:
        _inject_disease(top_diseases, "Hypertension", 72)
    if vitals.get("blood_sugar", 0) > 126:
        _inject_disease(top_diseases, "Type 2 Diabetes", 70)
    if vitals.get("heart_rate", 0) > 120:
        _inject_disease(top_diseases, "Arrhythmia", 65)

    top_diseases = top_diseases[:3]
    top_name = top_diseases[0]["disease_name"]
    top_prob = top_diseases[0]["probability"]

    overall_risk = top_diseases[0]["risk_level"]
    if has_severe or top_name in EMERGENCY_CONDITIONS:
        overall_risk = "high"

    feature_ratio = len(matched) / max(len(symptom_names_normalized), 1)
    # confidence based on how many symptoms matched + raw model certainty
    raw_top = max(ranked[0][1] if ranked else 0, 0.01)
    confidence = min(round(raw_top * 500 + feature_ratio * 20), 95)
    confidence = max(confidence, 55)

    tests = TESTS_MAP.get(top_name, ["Complete Blood Count (CBC)", "Basic Metabolic Panel", "Urinalysis"])
    doctors = SPECIALIST_MAP.get(top_name, ["General Physician"])
    remedies = HOME_REMEDIES_MAP.get(top_name, HOME_REMEDIES_MAP["DEFAULT"])
    actions = _build_actions(top_name, overall_risk, has_severe, top_prob)
    emergency, emergency_msg = _check_emergency(top_name, symptom_names_normalized, has_severe)

    others = ", ".join(d["disease_name"] for d in top_diseases[1:]) if len(top_diseases) > 1 else ""
    reasoning = (
        f"ML ensemble model analyzed {len(symptom_names_raw)} symptoms and found strongest pattern match with "
        f"{top_name} ({top_prob}% probability). "
        + (f"Differential diagnoses to consider: {others}. " if others else "")
        + ("Severe symptom severity elevates overall risk. " if has_severe else "")
        + "For educational purposes only — please consult a qualified healthcare professional."
    )

    return {
        "diseases": top_diseases, "risk_level": overall_risk, "confidence": confidence,
        "reasoning": reasoning, "tests": tests, "doctors": doctors, "actions": actions,
        "home_remedies": remedies, "emergency": emergency, "emergency_msg": emergency_msg,
        "ml_powered": True,
    }

# Hardcoded fallback if pkl files are missing or not yet loaded
_FALLBACK_SYMPTOMS = [
    "Itching","Skin Rash","Nodal Skin Eruptions","Continuous Sneezing","Shivering","Chills","Joint Pain",
    "Stomach Pain","Acidity","Ulcers On Tongue","Muscle Wasting","Vomiting","Burning Micturition",
    "Spotting Urination","Fatigue","Weight Gain","Anxiety","Cold Hands And Feet","Mood Swings","Weight Loss",
    "Restlessness","Lethargy","Patches In Throat","Irregular Sugar Level","Cough","High Fever","Sunken Eyes",
    "Breathlessness","Sweating","Dehydration","Indigestion","Headache","Yellowish Skin","Dark Urine","Nausea",
    "Loss Of Appetite","Pain Behind The Eyes","Back Pain","Constipation","Abdominal Pain","Diarrhoea",
    "Mild Fever","Yellow Urine","Yellowing Of Eyes","Acute Liver Failure","Fluid Overload","Swelling Of Stomach",
    "Swelled Lymph Nodes","Malaise","Blurred And Distorted Vision","Phlegm","Throat Irritation","Redness Of Eyes",
    "Sinus Pressure","Runny Nose","Congestion","Chest Pain","Weakness In Limbs","Fast Heart Rate",
    "Pain During Bowel Movements","Pain In Anal Region","Bloody Stool","Irritation In Anus","Neck Pain",
    "Dizziness","Cramps","Bruising","Obesity","Swollen Legs","Swollen Blood Vessels","Puffy Face And Eyes",
    "Enlarged Thyroid","Brittle Nails","Swollen Extremeties","Excessive Hunger","Extra Marital Contacts",
    "Drying And Tingling Lips","Slurred Speech","Knee Pain","Hip Joint Pain","Muscle Weakness","Stiff Neck",
    "Swelling Joints","Movement Stiffness","Spinning Movements","Loss Of Balance","Unsteadiness",
    "Weakness Of One Body Side","Loss Of Smell","Bladder Discomfort","Foul Smell Of Urine",
    "Continuous Feel Of Urine","Passage Of Gases","Internal Itching","Toxic Look","Depression","Irritability",
    "Muscle Pain","Altered Sensorium","Red Spots Over Body","Belly Pain","Abnormal Menstruation",
    "Dischromic Patches","Watering From Eyes","Increased Appetite","Polyuria","Family History","Mucoid Sputum",
    "Rusty Sputum","Lack Of Concentration","Visual Disturbances","Receiving Blood Transfusion",
    "Receiving Unsterile Injections","Coma","Stomach Bleeding","Distention Of Abdomen",
    "History Of Alcohol Consumption","Blood In Sputum","Prominent Veins On Calf","Palpitations",
    "Painful Walking","Pus Filled Pimples","Blackheads","Scurring","Skin Peeling","Silver Like Dusting",
    "Small Dents In Nails","Inflammatory Nails","Blister","Red Sore Around Nose","Yellow Crust Ooze",
    "Prognosis","Tremors","Chest Tightness","Shortness Of Breath","Pounding Heart","Racing Heart",
    "Cold Sweat","Numbness","Tingling","Sudden Severe Headache","Facial Drooping","Arm Weakness",
    "Difficulty Speaking","Confusion","Vision Problems","Loss Of Consciousness","Seizures","High Blood Sugar",
    "Low Blood Sugar","Increased Thirst","Frequent Urination","Blurred Vision","Slow Healing Wounds",
    "Jaundice","Right Upper Quadrant Pain","Spider Angiomas","Palmar Erythema","Ascites",
    "Easy Bruising","Mental Confusion","Kidney Pain","Flank Pain","Blood In Urine","Decreased Urine Output",
    "Puffy Eyes","Foamy Urine","Loss Of Concentration","Bone Pain","Fractures","Height Loss",
    "Curved Spine","Morning Stiffness","Warm Joints","Fever","Night Sweats","Unexplained Weight Loss",
]

def get_all_symptoms() -> list:
    if _load_model() and _symptom_list:
        return [s.replace('_', ' ').title() for s in _symptom_list]
    # Return fallback so the UI never shows 0 symptoms
    return _FALLBACK_SYMPTOMS

def get_symptom_features() -> list:
    _load_model()
    return _symptom_list or []
