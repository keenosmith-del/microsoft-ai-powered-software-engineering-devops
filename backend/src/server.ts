import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'ai-engineering-operations-platform',
        timestamp: new Date().toISOString(),
    });
});

app.listen(PORT, () => {
    console.log(`Backend API running on port ${PORT}`);
});
