export type Language = "en" | "hi" | "te";

export const translations = {
  en: {
    navbar_brand_subtitle: "Clinical Triage & Healthcare Operating System",
    navbar_book_appointment: "Book Appointment",
    navbar_doctor_portal: "Doctor Portal",
    navbar_patient_dashboard: "Patient Dashboard",
    navbar_emergency_sos: "🚨 Roadside Emergency SOS",
    select_language: "Language",
    language_en: "English",
    language_hi: "हिन्दी",
    language_te: "తెలుగు",

    // Welcome Modal
    welcome_title: "Choose Your Preferred Language",
    welcome_desc:
      "MediBridge AI supports multiple Indian languages for voice symptoms intake and consultation briefings.",
    welcome_confirm: "Continue to MediBridge",

    // Intake Form
    form_title: "Patient Clinical Intake & Triage",
    form_desc:
      "Fill in patient symptoms and attach previous prescriptions or diagnostic reports. Our autonomous clinical triage engine analyzes records in real-time.",
    patient_name: "Patient Full Name",
    patient_name_placeholder: "e.g. Rahul Sharma",
    age: "Age",
    gender: "Gender",
    gender_male: "Male",
    gender_female: "Female",
    gender_other: "Other",
    phone: "Contact Phone Number",
    phone_placeholder: "e.g. +91 98765 43210",
    symptoms: "Symptoms & Chief Medical Concern",
    symptoms_placeholder:
      "e.g. Sharp retrosternal chest pain with shortness of breath upon exertion for 2 days...",
    voice_help: "Tap mic to speak in your language",
    voice_listening: "Listening... speak now",
    voice_error: "Microphone permission denied or speech recognition not supported.",
    specialty: "Clinical Specialty",
    physician: "Select Physician",
    appointment_date: "Preferred Date",
    appointment_time: "Preferred Time Slot",

    // Document Uploads
    doc_vault_title: "Clinical Documentation Vault",
    doc_vault_subtitle: "Attach Medical Records for AI Triage (Optional)",
    doc_vault_desc:
      "Uploaded files are processed through Sarvam AI OCR and encrypted in the Cloudinary healthcare vault.",
    rx_title: "Previous Prescriptions",
    rx_subtitle: "Handwritten Rx notes, doctor slips",
    reports_title: "Medical Reports & Scans",
    reports_subtitle: "Lab reports, blood tests, X-rays, MRI scans",
    click_or_drag_rx: "Click or drag prescription",
    click_or_drag_report: "Click or drag lab report or radiology scan",
    upload_specs: "PDF, JPG, PNG up to 10MB",
    remove_file: "Remove",
    attached_prefix: "Attached:",

    // Booking Button
    book_visit: "Confirm & Issue Official Token →",
    booking_processing: "Processing Patient Intake...",

    // Emergency Modal
    emergency_sos_btn: "🚨 Roadside Emergency SOS",
    emergency_modal_title: "🚨 CRITICAL TRAUMA DISPATCH CONFIRMED",
    emergency_status_live: "DISPATCH ACTIVE · GPS TELEMETRY LOCKED",
    unit_assigned_label: "Unit Assigned",
    unit_assigned_val: "Smart AV-Ambulance #MED-09 (Autonomous Trauma Fleet)",
    eta_label: "Estimated Arrival",
    gps_coordinates_label: "Logged GPS Coordinates",
    reported_by_label: "Incident Logged By",
    reported_by_val: "Bystander / Roadside Alert",
    call_108: "Call 108 Emergency Backup",
    emergency_close: "Dismiss Telemetry Screen",
    emergency_dispatched_notice:
      "Hospital Trauma Bay alerted. Resuscitation team and crash cart on standby.",
  },
  hi: {
    navbar_brand_subtitle: "क्लिनिकल ट्रायज और हेल्थकेयर ऑपरेटिंग सिस्टम",
    navbar_book_appointment: "अपॉइंटमेंट बुक करें",
    navbar_doctor_portal: "डॉक्टर पोर्टल",
    navbar_patient_dashboard: "मरीज़ डैशबोर्ड",
    navbar_emergency_sos: "🚨 आपातकालीन दुर्घटना SOS",
    select_language: "भाषा",
    language_en: "English",
    language_hi: "हिन्दी",
    language_te: "తెలుగు",

    // Welcome Modal
    welcome_title: "अपनी पसंदीदा भाषा चुनें",
    welcome_desc:
      "मेडिब्रिज एआई वॉइस लक्षण और कंसल्टेशन के लिए भारतीय भाषाओं (हिंदी, तेलुगु, अंग्रेजी) का समर्थन करता है।",
    welcome_confirm: "मेडिब्रिज में आगे बढ़ें",

    // Intake Form
    form_title: "मरीज़ का क्लिनिकल विवरण एवं ट्रायज",
    form_desc:
      "मरीज़ के लक्षण दर्ज करें और पुराने नुस्खे या लैब रिपोर्ट संलग्न करें। हमारा एआई सिस्टम तुरंत विश्लेषण करेगा।",
    patient_name: "मरीज़ का पूरा नाम",
    patient_name_placeholder: "उदा. राहुल शर्मा",
    age: "उम्र",
    gender: "लिंग",
    gender_male: "पुरुष",
    gender_female: "महिला",
    gender_other: "अन्य",
    phone: "फ़ोन नंबर",
    phone_placeholder: "उदा. +91 98765 43210",
    symptoms: "लक्षण और मुख्य समस्या",
    symptoms_placeholder:
      "उदा. 2 दिनों से सीने में तेज़ दर्द और सांस लेने में कठिनाई हो रही है...",
    voice_help: "माइक दबाकर बोलें",
    voice_listening: "सुन रहा है... बोलिए",
    voice_error: "माइक की अनुमति नहीं मिली या ब्राउज़र में वॉइस इनपुट असमर्थित है।",
    specialty: "क्लिनिकल विभाग",
    physician: "डॉक्टर चुनें",
    appointment_date: "पसंदीदा तारीख",
    appointment_time: "पसंदीदा समय",

    // Document Uploads
    doc_vault_title: "क्लिनिकल दस्तावेज़ वॉल्ट",
    doc_vault_subtitle: "एआई विश्लेषण के लिए दस्तावेज़ संलग्न करें (वैकल्पिक)",
    doc_vault_desc:
      "अपलोड की गई फ़ाइलें सर्वम एआई ओसीआर द्वारा संसाधित और सुरक्षित क्लाउड में संग्रहीत होती हैं।",
    rx_title: "पुराने नुस्खे / पर्चियां",
    rx_subtitle: "हाथ से लिखी पर्चियां, डॉक्टर की रसीदें",
    reports_title: "मेडिकल रिपोर्ट और स्कैन",
    reports_subtitle: "लैब रिपोर्ट, रक्त परीक्षण, एक्स-रे, एमआरआई",
    click_or_drag_rx: "नुस्खा अपलोड करने के लिए क्लिक या ड्रैग करें",
    click_or_drag_report: "लैब रिपोर्ट या एक्स-रे अपलोड करें",
    upload_specs: "पीडीएफ, जेपीजी, पीएनजी (अधिकतम 10MB)",
    remove_file: "हटाएं",
    attached_prefix: "संलग्न:",

    // Booking Button
    book_visit: "पुष्टि करें और आधिकारिक टोकन प्राप्त करें →",
    booking_processing: "मरीज़ का विवरण संसाधित किया जा रहा है...",

    // Emergency Modal
    emergency_sos_btn: "🚨 आपातकालीन दुर्घटना SOS",
    emergency_modal_title: "🚨 गंभीर ट्रॉमा डिस्पैच की पुष्टि",
    emergency_status_live: "डिस्पैच सक्रिय · जीपीएस टेलीमेट्री लॉक",
    unit_assigned_label: "नियुक्त यूनिट",
    unit_assigned_val: "स्मार्ट एवी-एम्बुलेंस #MED-09 (ऑटोनॉमस ट्रॉमा फ्लीट)",
    eta_label: "अनुमानित आगमन समय",
    gps_coordinates_label: "दर्ज जीपीएस निर्देशांक",
    reported_by_label: "घटना दर्जकर्ता",
    reported_by_val: "राहगीर / सड़क किनारे अलर्ट",
    call_108: "108 आपातकालीन बैकअप को कॉल करें",
    emergency_close: "स्क्रीन बंद करें",
    emergency_dispatched_notice:
      "अस्पताल ट्रॉमा टीम को सतर्क कर दिया गया है। ट्रॉमा रिससिटेशन टीम तैयार है।",
  },
  te: {
    navbar_brand_subtitle: "క్లినికల్ ట్రయాజ్ & హెల్త్‌కేర్ ఆపరేటింగ్ సిస్టమ్",
    navbar_book_appointment: "అపాయింట్‌మెంట్ బుక్ చేయండి",
    navbar_doctor_portal: "డాక్టర్ పోర్టల్",
    navbar_patient_dashboard: "రోగి డాష్‌బోర్డ్",
    navbar_emergency_sos: "🚨 అత్యవసర రోడ్డు ప్రమాదం SOS",
    select_language: "భాష",
    language_en: "English",
    language_hi: "हिन्दी",
    language_te: "తెలుగు",

    // Welcome Modal
    welcome_title: "మీ ప్రాధాన్య భాషను ఎంచుకోండి",
    welcome_desc:
      "మెడిబ్రిడ్జ్ AI వాయిస్ లక్షణాల నమోదు మరియు వైద్య సంప్రదింపుల కోసం తెలుగు, హిందీ మరియు ఇంగ్లీష్ భాషలకు మద్దతు ఇస్తుంది.",
    welcome_confirm: "మెడిబ్రిడ్జ్‌కు కొనసాగించండి",

    // Intake Form
    form_title: "రోగి క్లినికల్ వివరాలు & ట్రయాజ్",
    form_desc:
      "రోగి లక్షణాలను నమోదు చేసి, మునుపటి ప్రిస్క్రిప్షన్లు లేదా ల్యాబ్ నివేదికలను జతచేయండి. AI ఇంజిన్ తక్షణమే విశ్లేషిస్తుంది.",
    patient_name: "రోగి పూర్తి పేరు",
    patient_name_placeholder: "ఉదా. రాహుల్ శర్మ",
    age: "వయస్సు",
    gender: "లింగం",
    gender_male: "పురుషుడు",
    gender_female: "మహిళ",
    gender_other: "ఇతర",
    phone: "ఫోన్ నంబర్",
    phone_placeholder: "ఉదా. +91 98765 43210",
    symptoms: "లక్షణాలు మరియు ప్రధాన సమస్య",
    symptoms_placeholder:
      "ఉదా. 2 రోజులుగా ఛాతీలో తీవ్రమైన నొప్పి మరియు శ్వాస తీసుకోవడంలో ఇబ్బంది...",
    voice_help: "మాట్లాడటానికి మైక్ నొక్కండి",
    voice_listening: "వింటోంది... మాట్లాడండి",
    voice_error: "మైక్రోఫోన్ అనుమతి నిరాకరించబడింది లేదా బ్రౌజర్ సపోర్ట్ చేయలేదు.",
    specialty: "క్లినికల్ విభాగం",
    physician: "వైద్యుడిని ఎంచుకోండి",
    appointment_date: "ప్రాధాన్య తేదీ",
    appointment_time: "ప్రాధాన్య సమయం",

    // Document Uploads
    doc_vault_title: "క్లినికల్ డాక్యుమెంటేషన్ వాల్ట్",
    doc_vault_subtitle: "AI విశ్లేషణ కోసం పత్రాలను జతచేయండి (ఐచ్ఛికం)",
    doc_vault_desc:
      "అప్‌లోడ్ చేసిన ఫైళ్లు Sarvam AI OCR ద్వారా ప్రాసెస్ చేయబడి సురక్షిత క్లౌడ్‌లో భద్రపరచబడతాయి.",
    rx_title: "మునుపటి ప్రిస్క్రిప్షన్లు",
    rx_subtitle: "చేతితో రాసిన ప్రిస్క్రిప్షన్లు, డాక్టర్ స్లిప్పులు",
    reports_title: "వైద్య నివేదికలు & స్కాన్లు",
    reports_subtitle: "ల్యాబ్ నివేదికలు, రక్త పరీక్షలు, ఎక్స్-రే, MRI",
    click_or_drag_rx: "ప్రిస్క్రిప్షన్ అప్‌లోడ్ చేయడానికి క్లిక్ లేదా డ్రాగ్ చేయండి",
    click_or_drag_report: "ల్యాబ్ నివేదిక లేదా ఎక్స్-రే అప్‌లోడ్ చేయండి",
    upload_specs: "PDF, JPG, PNG (గరిష్టంగా 10MB)",
    remove_file: "తొలగించు",
    attached_prefix: "జతచేయబడింది:",

    // Booking Button
    book_visit: "ధృవీకరించి అధికారిక టోకెన్ పొందండి →",
    booking_processing: "రోగి వివరాలు ప్రాసెస్ అవుతున్నాయి...",

    // Emergency Modal
    emergency_sos_btn: "🚨 అత్యవసర రోడ్డు ప్రమాదం SOS",
    emergency_modal_title: "🚨 అత్యవసర ట్రామా డిస్పాచ్ నిర్ధారించబడింది",
    emergency_status_live: "డిస్పాచ్ సక్రియం · GPS టెలిమెట్రీ లాక్ చేయబడింది",
    unit_assigned_label: "కేటాయించిన యూనిట్",
    unit_assigned_val: "స్మార్ట్ AV-అంబులెన్స్ #MED-09 (అటానమస్ ట్రామా ఫ్లీట్)",
    eta_label: "అంచనా వేసిన రాక సమయం",
    gps_coordinates_label: "నమోదైన GPS కోఆర్డినేట్లు",
    reported_by_label: "సమాచారం అందించినవారు",
    reported_by_val: "బాటసారులు / రోడ్డు పక్కన అలర్ట్",
    call_108: "108 అత్యవసర సేవలకు కాల్ చేయండి",
    emergency_close: "స్క్రీన్‌ను మూసివేయండి",
    emergency_dispatched_notice:
      "ఆసుపత్రి ట్రామా బే అప్రమత్తమైంది. అత్యవసర వైద్య బృందం సిద్ధంగా ఉంది.",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

