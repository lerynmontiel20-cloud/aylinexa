require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_KEY || '',
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { mensaje } = req.body;
    if (!mensaje) {
      return res.status(400).json({ error: 'Falta el mensaje' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Falta GEMINI_API_KEY en el servidor' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Sos un asistente útil para cuidado de mascotas en PetCare AI. Respondé de forma clara y amable en español. Consulta: ${mensaje}`;
    const result = await model.generateContent(prompt);
    const respuesta = result.response.text();

    res.json({ respuesta });
  } catch (error) {
    console.error('Error en /api/chat:', error);
    res.status(500).json({ error: 'Error al generar respuesta con Gemini' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});