export class GeminiClient {
  constructor(apiKey, model = 'gemini-3.5-flash') {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.model = model || process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  }

  async generateJSON(prompt, options = {}) {
    const apiKey = options.apiKey || this.apiKey;
    if (!apiKey) {
      throw new Error('No se ha proporcionado una API Key de Google AI Studio. Configúrala en .env o en los Ajustes del portal.');
    }

    const preferredModel = options.model || this.model || 'gemini-3.5-flash';
    // Modelos con cuota activa y fallback automático en caso de 429, 503 o 404
    const candidates = [
      preferredModel,
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3-flash-preview',
      'gemini-3.5-flash',
      'gemini-3.8-flash'
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);

    let lastError = null;

    for (const model of candidates) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          signal: AbortSignal.timeout(60000),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: options.temperature ?? 0.2
            }
          })
        });

        if (res.ok) {
          const jsonRes = await res.json();
          const text = jsonRes.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
            return JSON.parse(cleaned);
          }
        }

        const errText = await res.text();
        let parsedMsg = errText;
        try {
          const parsed = JSON.parse(errText);
          parsedMsg = parsed.error?.message || errText;
        } catch (e) {}

        console.warn(`[Gemini] ${model} respondió ${res.status}: ${parsedMsg.slice(0, 80)}`);

        // Si es 429 (límite de cuota), 503 (saturación) o 404, pasar al siguiente modelo con cuota
        if (res.status === 429 || res.status === 503 || res.status === 404) {
          lastError = new Error(`Google AI Studio [${res.status}]: ${parsedMsg}`);
          continue;
        }

        throw new Error(`Google AI Studio [${res.status}]: ${parsedMsg}`);
      } catch (fetchErr) {
        lastError = fetchErr;
        console.warn(`[Gemini] Error con ${model}:`, fetchErr.message);
        continue;
      }
    }

    throw lastError || new Error('No se pudo generar contenido con Google AI Studio.');
  }
}
