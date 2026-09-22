require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'ai-engineering-operations',
        environment: process.env.NODE_ENV || 'development',
    });
});

app.listen(PORT, () => {
    console.log(`AI Engineering Operations API running on port ${PORT}`);
});