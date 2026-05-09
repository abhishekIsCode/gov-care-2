import React, { useState, useRef } from 'react';
import { Camera, FileText, Upload, Loader2, Sparkles, Check, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

export default function DocumentScanner({ onResult }: { onResult: (metrics: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError("Unsupported file format. Please upload an image (JPG, PNG) or PDF.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const base64Data = await getBase64(file);
      // Remove data:image/...;base64, prefix
      const base64String = base64Data.split(',')[1];

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      
      const prompt = `You are a medical data extraction assistant. Analyze this medical document or lab result. 
      Extract a comprehensive structured format of the patient's medical records. 
      Include a full summary, key findings, diagnoses, medications, and any other relevant details in a single formatted text block, but return it strictly within a JSON field "extractedText".
      Example: {"extractedText": "Patient History:\\n- Hypertension\\n\\nMedications:\\n- Lisinopril 10mg"}
      Do not include any markdown formatting outside the JSON, only valid JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: file.type, data: base64String } },
            { text: prompt }
          ]
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      let jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse JSON from response");
      
      const parsedData = JSON.parse(jsonMatch[0]);
      onResult(parsedData);
      setSuccess(true);
      
      // Reset after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process document");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="bg-stone-50/40 border border-teal-500/10 p-8 rounded-3xl relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-colors" />

      <div className="flex items-center gap-4 mb-6 relative">
        <div className="p-3 bg-purple-500/10 text-purple-600 rounded-2xl relative">
          <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-teal-500 animate-pulse" />
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-medium text-stone-800  tracking-wider">AI Document Scanner</h3>
          <p className="text-sm text-stone-800/50 font-medium">Extract lab results & medical records</p>
        </div>
      </div>

      <div className="relative">
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileUpload} 
          accept="image/*,application/pdf"
          className="hidden" 
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className={`w-full py-12 border border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 transition-all ${
            error ? 'border-red-300 bg-red-50/50 text-red-700' :
            success ? 'border-teal-300 bg-stone-50/50 text-teal-700' :
            'border-stone-200 bg-white/40 text-teal-700 hover:bg-stone-50/80 hover:border-teal-300'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
              <span className="font-medium tracking-wide text-sm ">Analyzing Document...</span>
            </>
          ) : success ? (
            <>
              <Check className="w-8 h-8 text-teal-500" />
              <span className="font-medium tracking-wide text-sm  text-teal-600">Successfully Extracted!</span>
            </>
          ) : error ? (
            <>
              <AlertCircle className="w-8 h-8 text-red-500" />
              <span className="font-medium text-sm text-center px-4">{error}</span>
            </>
          ) : (
            <>
              <div className="p-4 bg-stone-100/50 rounded-full shadow-inner text-teal-600">
                <Camera className="w-6 h-6" />
              </div>
              <div className="text-center">
                <span className="font-medium tracking-wide text-sm  block mb-1">Upload Photo or PDF</span>
                <span className="text-xs font-medium opacity-60">Gemini will automatically extract your medical data</span>
              </div>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
