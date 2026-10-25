
'use strict';

const Groq = require('groq-sdk');

function getGroq() {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is required for AI code review');
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

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
  const warnings = [];
  for (let start = 0; start < diffText.length; start += MAX_DIFF_CHARS) {
    const chunk = diffText.slice(start, start + MAX_DIFF_CHARS);
    const response = await getGroq().chat.completions.create({
      model: MODEL,
      temperature: 0.1,
      max_tokens: 512,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Review this diff chunk (${start}-${start + chunk.length}):\n\n${chunk}` },
      ],
    });
    const raw = response.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error('Code Guardian returned no response');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Code Guardian response was not a warning array');
    warnings.push(...parsed.map(String));
  }
  return { warnings };
}

module.exports = { codeGuardian };
