import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface FamilyProfile {
  id: string;
  name: string;
  ageGroup: "Baby" | "Kid" | "Adult";
  allergies: string;
  concerns: string; // e.g., "High Sugar, Artificial Colors"
}

export interface Ingredient {
  name: string;
  score: "Safe" | "Unsafe" | "Issues";
  reason?: string;
}

export interface IngredientAnalysis {
  productName: string;
  ingredients: Ingredient[];
  healthAnalysis: {
    babies: {
      riskLevel: "Low" | "Moderate" | "High";
      concerns: string[];
      recommendation: string;
    };
    kids: {
      riskLevel: "Low" | "Moderate" | "High";
      concerns: string[];
      recommendation: string;
    };
    adults: {
      riskLevel: "Low" | "Moderate" | "High";
      concerns: string[];
      recommendation: string;
    };
  };
  harmfulChemicals: Array<{
    name: string;
    reason: string;
    severity: "Low" | "Medium" | "High";
  }>;
  familyAlerts?: Array<{
    profileName: string;
    severity: "Low" | "Medium" | "High";
    message: string;
  }>;
}

export async function analyzeIngredients(
  input: { base64Image?: string; manualText?: string },
  profiles: FamilyProfile[] = []
): Promise<IngredientAnalysis> {
  const profileContext = profiles.length > 0 
    ? `\n\nFamily Profiles to consider:
       ${profiles.map(p => `- ${p.name} (${p.ageGroup}): Allergies: ${p.allergies || "None"}, Concerns: ${p.concerns || "None"}`).join("\n")}
       If any ingredient conflicts with a profile's allergies or concerns, include a "familyAlerts" array in the response.`
    : "";

  const contentParts: any[] = [
    {
      text: `Analyze this grocery product's ingredient list. 
            1. Extract the product name if visible/provided.
            2. Extract EVERY SINGLE ingredient listed. Do not skip any.
            3. For each ingredient, assign a score: "Safe", "Unsafe", or "Issues". 
               - "Safe": Generally recognized as safe for most people.
               - "Issues": May cause problems for some (e.g., allergens, high sugar, controversial additives).
               - "Unsafe": Known harmful chemicals, banned substances, or highly problematic additives.
            4. Provide a health analysis for three groups: Babies (0-2), Kids (3-12), and Adults.
            5. Identify specific harmful chemicals or additives and explain why they are problematic.${profileContext}
            
            Return the data in the following JSON format:
            {
              "productName": "string",
              "ingredients": [
                { "name": "string", "score": "Safe|Unsafe|Issues", "reason": "optional brief reason if not Safe" }
              ],
              "healthAnalysis": {
                "babies": { "riskLevel": "Low|Moderate|High", "concerns": ["string"], "recommendation": "string" },
                "kids": { "riskLevel": "Low|Moderate|High", "concerns": ["string"], "recommendation": "string" },
                "adults": { "riskLevel": "Low|Moderate|High", "concerns": ["string"], "recommendation": "string" }
              },
              "harmfulChemicals": [
                { "name": "string", "reason": "string", "severity": "Low|Medium|High" }
              ],
              "familyAlerts": [
                { "profileName": "string", "severity": "Low|Medium|High", "message": "string" }
              ]
            }`,
    }
  ];

  if (input.base64Image) {
    contentParts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: input.base64Image.split(",")[1] || input.base64Image,
      },
    });
  } else if (input.manualText) {
    contentParts.push({
      text: `Manual Ingredient List to analyze: ${input.manualText}`,
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: contentParts }],
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as IngredientAnalysis;
}
