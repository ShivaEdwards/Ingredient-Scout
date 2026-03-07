# Ingredient Scout 🛡️

**Ingredient Scout** is an AI-powered safety scanner for grocery products. It helps families identify harmful chemicals and health risks in real-time by scanning ingredient labels or manually entering ingredient lists.

## ✨ Key Features

- **AI Ingredient Decoding:** Uses Gemini 3 Flash to identify and score every ingredient in a product.
- **Family Profiles:** Create personalized profiles for family members (Baby, Kid, Adult) with specific allergies and health concerns.
- **Safety Alerts:** Automatically cross-references ingredients with family profiles to provide instant safety warnings.
- **Risk Assessment:** Provides detailed health risk levels (Low, Moderate, High) for different age groups.
- **Harmful Additive Identification:** Flags specific harmful chemicals and explains why they are problematic.
- **Mobile-First Design:** Optimized for scanning labels on-the-go at grocery stores.
- **Scan History:** Keeps track of your previous scans for quick reference.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Google Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone <your-github-repo-url>
   cd ingredient-scout
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser to `http://localhost:3000`.

## 🧪 Beta Testing Instructions

1. **Create Profiles:** Start by adding family members in the "Family Profiles" section. Be sure to list any allergies or specific concerns (e.g., "High Sugar", "Red 40").
2. **Scan a Product:** Use the "Scan Label" button to take a photo of an ingredient list on a real product.
3. **Review Results:** Check the "Family Safety Alerts" section for any personalized warnings.
4. **Refine Profiles:** Try updating a profile's concerns while viewing results to see the analysis update in real-time.

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **AI:** Google Gemini 3 Flash
- **Animations:** Motion (Framer Motion)
- **Icons:** Lucide React
- **Image Processing:** React Image Crop

## ⚖️ Disclaimer

*Ingredient Scout is for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with a healthcare professional regarding allergies or dietary restrictions.*
