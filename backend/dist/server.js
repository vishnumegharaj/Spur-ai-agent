"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = __importDefault(require("./db/prisma"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', async (req, res) => {
    try {
        await prisma_1.default.$queryRaw `SELECT 1`;
        res.json({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected'
        });
    }
});
//chat routes
app.use('/chat', chat_routes_1.default);
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
