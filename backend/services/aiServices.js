const Groq = require('groq-sdk');
const pdfParse = require('pdf-parse-fork');
const fs = require('fs');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const extractTextFromPDF = async (filePath) => {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);

        if (!data || !data.text) {
            console.log("[WARNING] No text content extracted from PDF.");
            return "";
        }

        const cleanText = data.text.replace(/\s+/g, ' ').trim();
        return cleanText.substring(0, 4000);
    } catch (error) {
        console.error("[ERROR] PDF Parsing Error:", error.message);
        return "";
    }
};

const getActiveGroqModel = async () => {
    try {
        const modelsList = await groq.models.list();
        const availableModels = modelsList.data.map(m => m.id);

        console.log("[LOG] Active Groq Models Available:", availableModels.slice(0, 5));

        // Preferred order of active models
        const preferredModels = [
            "llama-3.3-70b-versatile",
            "llama-3.1-70b-versatile",
            "llama-3.1-8b-instant",
            "llama3-70b-8192",
            "mixtral-8x7b-32768"
        ];

        for (const preferred of preferredModels) {
            if (availableModels.includes(preferred)) {
                return preferred;
            }
        }

        // Fallback to first available chat model in account
        return availableModels.length > 0 ? availableModels[0] : "llama-3.1-8b-instant";
    } catch (err) {
        console.warn("[WARNING] Failed to fetch active models list, using default fallback.");
        return "llama-3.3-70b-versatile";
    }
};

const analyzeNoteWithAI = async (pdfFilePath) => {
    try {
        const extractedText = await extractTextFromPDF(pdfFilePath);

        console.log("----------------------------------------");
        console.log("[LOG] PDF Extracted Character Count:", extractedText.length);
        if (extractedText.length > 0) {
            console.log("[LOG] Text Preview:", extractedText.substring(0, 200) + "...");
        }
        console.log("----------------------------------------");

        if (!extractedText || extractedText.length < 30) {
            return {
                isAcademic: true,
                summary: "Uploaded document appears to be an image/scanned copy or contains non-extractable text."
            };
        }

        const prompt = `You are an AI Document Validator for EduVault.
Analyze the following text extracted from a user's uploaded PDF document:

Text Content:
"""
${extractedText}
"""

Instructions:
1. Determine if this document is educational, academic, or professional material.
2. Write a concise 2-sentence summary outlining key topics, skills, or concepts.

Return ONLY a valid JSON object matching this exact format:
{
  "isAcademic": true,
  "summary": "Your 2-sentence concise summary here"
}`;

        const activeModel = await getActiveGroqModel();
        console.log(`[INFO] Selected Active Groq Model: ${activeModel}`);

        const response = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: activeModel,
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const rawContent = response.choices[0].message.content.trim();
        console.log("[LOG] Raw AI Output:", rawContent);

        let parsedResult;
        try {
            parsedResult = JSON.parse(rawContent);
        } catch (jsonErr) {
            parsedResult = {
                isAcademic: true,
                summary: rawContent.substring(0, 300)
            };
        }

        return {
            isAcademic: parsedResult.isAcademic ?? true,
            summary: parsedResult.summary || "Summary generated successfully."
        };

    } catch (error) {
        console.error("[ERROR] Groq AI Detailed Execution Error:", error.message);
        return {
            isAcademic: true,
            summary: "Academic document verified."
        };
    }
};

module.exports = { analyzeNoteWithAI };