import { GoogleGenAI, Type } from "@google/genai";
import { HealthRecord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface ExtractedIdData {
  healthId: string;
  fullName: string;
  dateOfBirth?: string;
}

export async function extractIdFromPhoto(base64Image: string, mimeType: string = "image/jpeg"): Promise<ExtractedIdData> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
        {
          text: "Analyze this image. If it is a valid health ID card or contains a QR code, extract the Health ID, Full Name, and Date of Birth (YYYY-MM-DD). If the image is not a health card or doesn't contain a clear ID, return an object with an 'error' field explaining that a valid Health ID or QR is required. Return JSON.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          healthId: { type: Type.STRING },
          fullName: { type: Type.STRING },
          dateOfBirth: { type: Type.STRING },
          error: { type: Type.STRING },
        },
      },
    },
  });

  const text = response.text || "{}";
  const parsed = JSON.parse(text);

  if (parsed.error) {
    throw new Error(parsed.error);
  }
  return parsed;
}

export async function getHealthSuggestions(records: HealthRecord[], medicalDetails: string = ''): Promise<string> {
  const historyText = records.map(r => 
    `Date: ${r.date}, Diagnosis: ${r.diagnosis || 'N/A'}, Medications: ${r.medications || 'N/A'}, Type: ${r.type}, Notes: ${r.notes}`
  ).join('\n');

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an AI Health Assistant for a Government Health Portal. 
    Based on the following medical history and records, provide concise, professional, and helpful health advice.
    Suggest lifestyle changes, potential screening tests to discuss with a doctor, or general wellness tips. Pay special attention to any active problems or allergies mentioned in the records.
    
    Medical Details:
    ${medicalDetails || 'None documented'}

    Medical History:
    ${historyText}`,
    config: {
      systemInstruction: "Empathetic but clinical medical assistant. Return Markdown. Always include a disclaimer that this is not professional medical advice.",
    }
  });

  return response.text || "No suggestions at this time.";
}

export async function getRecommendedNextSteps(history: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this patient's clinical timeline and suggest two or three recommended next steps (e.g., specialists to visit, screenings to schedule). Keep it concise and professional.
    
    Clinical Timeline:
    ${history}`,
    config: {
      systemInstruction: "You are an AI Health Navigator for a government health portal.",
    }
  });

  return response.text || "Continue regular checkups as advised by your GP.";
}

export async function getHospitalRecommendation(symptoms: string, pastRecords: HealthRecord[] = []): Promise<{ facilityName: string, doctorName: string, reason: string }> {
  const historyText = pastRecords.map(r => 
    `Date: ${r.date}, Facility: ${r.facilityName || 'N/A'}, Doctor: ${r.doctorName || 'N/A'}, Diagnosis: ${r.diagnosis || 'N/A'}`
  ).join('\n');

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an intelligent health navigator. A patient is feeling the following symptoms/illness:
    "${symptoms}"

    Here is their past medical history:
    ${historyText}

    Task: Recommend the most appropriate hospital/facility and a doctor. 
    1. If the patient has previously visited a facility/doctor for a similar or related issue, recommend that one.
    2. Otherwise, recommend a nearby or suitable general hospital/specialist based on the symptoms (you can simulate/invent a realistic facility name if there's no history).

    Return ONLY a JSON object with:
    - facilityName (string)
    - doctorName (string)
    - reason (string: explanation of why this facility/doctor is recommended based on their symptoms or past history)`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          facilityName: { type: Type.STRING },
          doctorName: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
      },
    }
  });

  const text = response.text || "{}";
  return JSON.parse(text);
}

export interface ExtractedMedicalRecord {
  diagnosis: string;
  medications: string;
  notes: string;
  date: string; // YYYY-MM-DD
  facilityName: string;
  doctorName: string;
}

export async function extractMedicalDataFromDocument(base64Image: string, mimeType: string = "image/jpeg"): Promise<ExtractedMedicalRecord> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
        {
          text: "Analyze this medical document (prescription, lab result, checkup note). Extract the diagnosis, medications prescribed, any additional notes, the date of the document (YYYY-MM-DD), the facility name, and the doctor's name. If a field is not found, leave it as an empty string. Determine the record type: 'Checkup', 'Prescription', 'Lab Result', or 'Specialist Visit'. Return JSON.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          diagnosis: { type: Type.STRING },
          medications: { type: Type.STRING },
          notes: { type: Type.STRING },
          date: { type: Type.STRING },
          facilityName: { type: Type.STRING },
          doctorName: { type: Type.STRING },
        },
      },
    },
  });

  const text = response.text || "{}";
  return JSON.parse(text);
}
