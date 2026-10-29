export class AIService {
  constructor() {
    this.model = 'gemini-3.5-flash';
    this.customKey = localStorage.getItem('ep_gemini_key') || '';
  }

  setApiKey(key) {
    this.customKey = key;
    if (key) localStorage.setItem('ep_gemini_key', key);
    else localStorage.removeItem('ep_gemini_key');
  }

  async json(prompt, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.customKey) {
      headers['x-gemini-key'] = this.customKey;
    }

    const res = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt,
        model: opts.model || this.model,
        temperature: opts.temperature ?? 0.2
      })
    });

    if (!res.ok) {
      let errData = {};
      try { errData = await res.json(); } catch (e) {}
      throw {
        code: errData.code || 'ai_error',
        message: errData.error || `Error en la llamada a Gemini (${res.status})`
      };
    }

    return await res.json();
  }
}
