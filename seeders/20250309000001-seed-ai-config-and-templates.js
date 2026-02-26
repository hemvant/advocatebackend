'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const [rows] = await queryInterface.sequelize.query('SELECT id FROM ai_config LIMIT 1').catch(() => [[]]);
    if (!rows || rows.length === 0) {
      await queryInterface.bulkInsert('ai_config', [{
        provider: 'sarvam',
        encrypted_api_key: null,
        api_key_masked: null,
        base_url: null,
        rate_limit_per_user_per_min: 10,
        rate_limit_org_daily: 500,
        is_active: false,
        created_at: now,
        updated_at: now
      }]);
    }

    const templates = [
      { feature_key: 'case_summary', system_prompt: 'You are a legal assistant. Given case facts, produce a structured summary with sections: facts, issues, arguments, risks. Be concise.', user_prompt_format: '{{content}}', temperature: 0.3, max_tokens: 4096, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'draft', system_prompt: 'You are an expert Indian legal draftsman. Generate a professional, formatted legal document. Output only the document text.', user_prompt_format: '{{content}}', temperature: 0.4, max_tokens: 4096, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'judgment_summary', system_prompt: 'Summarize the judgment: key facts, legal issues, court reasoning, and decision. Be concise.', user_prompt_format: '{{content}}', temperature: 0.3, max_tokens: 4096, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'cross_exam', system_prompt: 'You are a litigation expert. Generate cross-examination questions from the witness statement, grouped by category.', user_prompt_format: 'Witness statement:\n{{content}}', temperature: 0.4, max_tokens: 4096, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'fir_analysis', system_prompt: 'Analyze the FIR: extract IPC/sections, suggest defense angles, identify prosecution weaknesses.', user_prompt_format: 'FIR text:\n{{content}}', temperature: 0.3, max_tokens: 4096, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'legal_research', system_prompt: 'You are a legal research assistant. Answer with structured explanation: relevant laws, precedents, practical implications.', user_prompt_format: 'Query: {{content}}', temperature: 0.3, max_tokens: 4096, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'chat', system_prompt: 'You are a helpful legal assistant for Indian advocates.', user_prompt_format: '{{content}}', temperature: 0.5, max_tokens: 2048, is_active: true, created_at: now, updated_at: now }
    ];
    for (const t of templates) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM ai_prompt_templates WHERE feature_key = '${t.feature_key}' LIMIT 1`
      ).catch(() => [[]]);
      if (!existing || existing.length === 0) {
        await queryInterface.bulkInsert('ai_prompt_templates', [t]);
      }
    }
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('ai_prompt_templates', null, {});
    await queryInterface.bulkDelete('ai_config', null, {});
  }
};
