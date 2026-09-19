
'use strict';

const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = 'qwen/qwen3.8-27b';
const MAX_DIFF_CHARS = 8000;

const SYSTEM_PROMPT = `You are a security-focused code reviewer.

Scan the git diff for these issues ONLY in added lines (lines starting with '+'):
1. Hardcoded secrets — API keys, passwords, tokens, private keys, connection strings with credentials
2. Debug artifacts — console.log, console.error, debugger, print(), var_dump(), pdb.set_trace()
3. Unresolved markers — TODO, FIXME, HACK, XXX comments

Return ONLY a raw JSON array of short warning strings describing each issue found.
Each warning must mention the likely filename and line context if visible.
If nothing is found, return an empty JSON array: []

Do not include any explanation, markdown formatting, or text outside the JSON array.
The first character of your response must be '[' and the last must be ']'.`;


async function codeGuardian(diffText) {
  const truncated = diffText.length > MAX_DIFF_CHARS
    ? diffText.slice(0, MAX_DIFF_CHARS) + '\n... [diff truncated]'
    : diffText;

  const response = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.1,   
    max_tokens: 512,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: `Review this diff:\n\n${truncated}` },
    ],
  });

  const raw = response.choices[0].message.content.trim();

  
  try {
    const parsed = JSON.parse(raw);
    const warnings = Array.isArray(parsed) ? parsed.map(String) : [];
    return { warnings };
  } catch {
    
    console.warn('[codeGuardian] Failed to parse model response as JSON:', raw.slice(0, 200));
    return { warnings: [] };
  }
}

module.exports = { codeGuardian };
