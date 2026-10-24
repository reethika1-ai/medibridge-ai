# 🏥 MediBridge AI — Clinical Triage & Pre-Consultation Platform

> **Live Demo:** [medibridge-ai-gamma.vercel.app](https://medibridge-ai-gamma.vercel.app)  
> **GitHub Repository:** [github.com/reethika1-ai/medibridge-ai](https://github.com/reethika1-ai/medibridge-ai)

MediBridge AI is an AI-powered clinical pre-consultation platform built with **Next.js 16**. It automates patient intake, extracts handwritten medical notes using background OCR, and generates structured clinical summaries for doctors before the patient enters the consultation room.

---

## ⚡ Features

* 🎫 **Instant Appointment Tokens:** Generates unique patient booking tokens and live queue status tracking.
* 📝 **Handwritten OCR Pipeline:** Automatically extracts handwritten prescriptions and lab reports using **Sarvam AI**.
* 🧠 **AI Clinical Summaries:** Synthesizes symptoms and OCR text into structured medical notes using **xAI Grok**.
* 🩺 **Doctor Triage Portal:** Urgency-prioritized queue with slide-over clinical briefings and live status updates.
* 🔒 **Encrypted Storage:** Secure medical document vault powered by **Cloudinary**.

---

## 🛠️ Tech Stack

* **Framework:** Next.js 16 (App Router), React 19, TypeScript
* **Styling:** Tailwind CSS
* **Database & Auth:** Supabase (PostgreSQL)
* **File Storage:** Cloudinary
* **AI & OCR:** xAI Grok API, Sarvam AI API
* **Deployment:** Vercel

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone [https://github.com/reethika1-ai/medibridge-ai.git](https://github.com/reethika1-ai/medibridge-ai.git)
cd medibridge-ai

2. Install Dependencies
Bash
npm install

3. Environment Setup
Create a .env.local file in the root folder with the following variables:

Code snippet
SUPABASE_URL=[https://your-supabase-id.supabase.co](https://your-supabase-id.supabase.co)
SUPABASE_SECRET_KEY=your_supabase_secret_key

GROK_API_KEY=your_xai_grok_key
SARVAM_AI_API_KEY=your_sarvam_ai_key

CLOUDINARY_URL=cloudinary://your_key:your_secret@your_cloud_name
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

DOCTOR_PASSWORD=medibridge2026
4. Run Development Server
Bash
npm run dev
Open http://localhost:3000 in your browser.
