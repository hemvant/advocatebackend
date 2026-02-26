'use strict';

const https = require('https');
const http = require('http');
const BaseProvider = require('./BaseProvider');

class SarvamProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.apiKey = config.apiKey || '';
    this.baseUrl = (config.baseUrl || 'https://api.sarvam.ai/v1/chat/completions').trim();
    this.model = config.model || 'sarvam-m';
  }

  async chatCompletion(messages, options = {}) {
    if (!this.apiKey) return null;
    const url = new URL(this.baseUrl);
    const body = JSON.stringify({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: options.max_tokens ?? 4096,
      temperature: options.temperature ?? 0.3
    });
    return new Promise((resolve) => {
      const opts = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body, 'utf8'),
          'api-subscription-key': this.apiKey,
          Authorization: 'Bearer ' + this.apiKey
        }
      };
      const req = (url.protocol === 'https:' ? https : http).request(opts, (res) => {
        let data = '';
        res.on('data', (ch) => { data += ch; });
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            const text = j.choices?.[0]?.message?.content ?? j.content ?? null;
            const usage = j.usage ? { prompt_tokens: j.usage.prompt_tokens || 0, completion_tokens: j.usage.completion_tokens || 0, total_tokens: j.usage.total_tokens || 0 } : undefined;
            resolve(text != null ? { text: String(text).trim(), usage } : null);
          } catch (e) {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(90000, () => { req.destroy(); resolve(null); });
      req.write(body);
      req.end();
    });
  }
}

module.exports = SarvamProvider;
