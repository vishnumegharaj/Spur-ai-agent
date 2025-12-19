import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

// Validate API key on startup
if (!process.env.GEMINI_API_KEY) {
    console.error("ERROR: GEMINI_API_KEY environment variable is not set!");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
});


const SYSTEM_PROMPT = `
You are a helpful customer support agent about a small e-commerce store.

Store info:
- Shipping: 3–5 business days, ships to India and USA
- Returns: 7-day return on unused items
- Support hours: Mon–Fri, 10am–6pm IST

Rules:
1. Be helpful, friendly, and professional
2. Answer questions clearly and concisely
3. Use proper formatting with headings and bullet points for clarity
4. If information is not in the knowledge base, politely inform the customer and offer to help with related questions
5. Always prioritize customer satisfaction
6. For issues outside your knowledge, guide customers to contact support directly
`;

const generateResponse = async (history: { role: "user" | "assistant"; content: string }[],
    userMessage: string) => {
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 30000; // 30 seconds
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Create timeout promise
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("AI request timeout")), TIMEOUT_MS);
            });

            // Create AI request promise
            const aiRequestPromise = (async () => {
                const chat = model.startChat({
                    history: history.map((m) => ({
                        role: m.role === "user" ? "user" : "model",
                        parts: [{ text: m.content }],
                    })),
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 500,
                    },
                });

                const result = await chat.sendMessage(
                    `${SYSTEM_PROMPT}\n\nUser question: ${userMessage}`
                );

                return result.response.text();
            })();

            // Race between timeout and AI request
            const response = await Promise.race([aiRequestPromise, timeoutPromise]);

            // Validate response
            if (!response || !response.trim()) {
                throw new Error("Empty response from AI");
            }

            // Check for inappropriate responses (basic safety)
            if (response.toLowerCase().includes("i cannot") &&
                response.toLowerCase().includes("assist")) {
                console.warn("AI refused to answer, trying again...");
                if (attempt < MAX_RETRIES) continue;
            }

            return response.trim();

        } catch (error) {
            const isLastAttempt = attempt === MAX_RETRIES;

            console.error(`AI generation error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error);

            // Handle specific error types
            if (error instanceof Error) {
                const errorMessage = error.message.toLowerCase();

                // Rate limit errors
                if (errorMessage.includes("rate limit") ||
                    errorMessage.includes("quota") ||
                    errorMessage.includes("429")) {
                    throw new Error("RATE_LIMIT: Too many requests. Please wait a moment.");
                }

                // API key errors
                if (errorMessage.includes("api key") ||
                    errorMessage.includes("unauthorized") ||
                    errorMessage.includes("401") ||
                    errorMessage.includes("403")) {
                    throw new Error("API_KEY_ERROR: Invalid API configuration.");
                }

                // Timeout errors
                if (errorMessage.includes("timeout") ||
                    errorMessage.includes("etimedout") ||
                    errorMessage.includes("econnaborted")) {
                    if (isLastAttempt) {
                        throw new Error("TIMEOUT: Request timed out. Please try again.");
                    }
                    // Retry on timeout
                    console.log(`Timeout on attempt ${attempt + 1}, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                    continue;
                }

                // Network errors
                if (errorMessage.includes("network") ||
                    errorMessage.includes("enotfound") ||
                    errorMessage.includes("econnrefused")) {
                    throw new Error("NETWORK_ERROR: Network connection failed.");
                }

                // Content filtering
                if (errorMessage.includes("safety") ||
                    errorMessage.includes("blocked")) {
                    return "I apologize, but I need to keep our conversation appropriate and helpful. Could you please rephrase your question?";
                }
            }

            // If last attempt, throw generic error
            if (isLastAttempt) {
                throw new Error("AI_ERROR: Failed to generate response after multiple attempts.");
            }

            // Retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
    }

    // Fallback (should never reach here due to throw in loop)
    return "I apologize, but I'm having trouble responding right now. Please try again in a moment, or contact our support team directly.";

};

export default generateResponse;