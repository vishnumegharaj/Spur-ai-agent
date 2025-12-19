import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./db/prisma";


import chatRoutes from "./routes/chat.routes";

dotenv.config();

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ 
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({ 
            status: 'unhealthy',
            database: 'disconnected'
        });
    }
});

//chat routes
app.use('/chat', chatRoutes);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
