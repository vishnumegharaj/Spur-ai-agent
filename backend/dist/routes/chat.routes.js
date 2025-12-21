"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../db/prisma"));
const llm_service_1 = __importDefault(require("../services/llm.service"));
const router = (0, express_1.Router)();
router.post("/message", async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        // Validate input
        if (!message || typeof message !== "string" || !message.trim()) {
            return res.status(400).json({ error: "Message is required" });
        }
        // Handle very long messages (requirement: "Handle very long messages sensibly")
        const MAX_MESSAGE_LENGTH = 1000;
        const trimmedMessage = message.trim();
        if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({
                error: `Message is too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`
            });
        }
        let conversationId = sessionId;
        if (!conversationId) {
            try {
                const convo = await prisma_1.default.conversation.create({
                    data: {
                        createdAt: new Date(),
                    }
                });
                conversationId = convo.id;
            }
            catch (dbError) {
                console.error("Failed to create conversation:", dbError);
                return res.status(500).json({
                    error: "Failed to start a new conversation. Please try again."
                });
            }
        }
        // saving user message
        await prisma_1.default.message.create({
            data: {
                conversationId,
                sender: "user",
                text: message,
            },
        });
        // last 10 messages for context
        // im only using last 10 messages so that ai doesn't get overwhelmed and no overuse of tokens.
        // this way we can save money on tokens
        const pastMessages = await prisma_1.default.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: "asc" },
            take: 10,
        });
        const history = pastMessages
            .filter(m => m.text && m.text.trim()) // Filter out any empty messages
            .map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
        }));
        // generating ai response by calling llm service
        let reply;
        try {
            reply = await (0, llm_service_1.default)(history, trimmedMessage);
            // Validate that we got a proper response
            if (!reply || !reply.trim()) {
                throw new Error("Empty response from AI");
            }
        }
        catch (aiError) {
            console.error("AI generation error:", aiError);
            // Check for specific error types
            if (aiError instanceof Error) {
                if (aiError.message.includes("rate limit") || aiError.message.includes("429")) {
                    return res.status(503).json({
                        error: "Our support agent is experiencing high demand. Please try again in a moment."
                    });
                }
                if (aiError.message.includes("timeout") || aiError.message.includes("ETIMEDOUT")) {
                    return res.status(504).json({
                        error: "Request timed out. Please try again."
                    });
                }
                if (aiError.message.includes("invalid") || aiError.message.includes("API key")) {
                    return res.status(500).json({
                        error: "Support agent configuration error. Please contact support."
                    });
                }
            }
            return res.status(500).json({
                error: "Our support agent is temporarily unavailable. Please try again in a moment."
            });
        }
        // saving ai message
        await prisma_1.default.message.create({
            data: {
                conversationId,
                sender: "ai",
                text: reply,
            },
        });
        res.json({
            reply,
            sessionId: conversationId,
        });
    }
    catch (error) {
        console.error("Unexpected error in chat route:", error);
        res.status(500).json({ error: "An unexpected error occurred. Please try again." });
    }
});
// GET chat history
router.get("/history/:sessionId", async (req, res) => {
    const sessionId = Number(req.params.sessionId);
    if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session id" });
    }
    const conversation = await prisma_1.default.conversation.findUnique({
        where: { id: sessionId },
        include: {
            messages: {
                orderBy: { createdAt: "asc" },
            },
        },
    });
    if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
    }
    res.json({
        sessionId: conversation.id,
        messages: conversation.messages.map((m) => ({
            role: m.sender === "user" ? "user" : "ai",
            text: m.text,
        })),
    });
});
exports.default = router;
