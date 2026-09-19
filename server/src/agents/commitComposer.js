
'use strict';

const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = 'qwen/qwen3.8-27b';
const MAX_DIFF_CHARS = 8000; 

const SYSTEM_PROMPT = `You are a senior software engineer writing git commit messages.

Rules:
- Return ONE commit message, nothing else — no explanation, no preamble, no quotes.
- Keep the summary line at most 72 characters.
- Use Conventional Commits style where it fits: feat:, fix:, refactor:, chore:, docs:, test:, style:, perf:.
- If the diff touches multiple concerns, pick the most significant one.
- Write in the imperative mood ("add feature" not "added feature").
- Do not wrap the message in backticks or quotes.`;


async function commitComposer(diffText) {
  
  const truncated = diffText.length > MAX_DIFF_CHARS
    ? diffText.slice(0, MAX_DIFF_CHARS) + '\n... [diff truncated]'
    : diffText;

  const response = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.3,   
    max_tokens: 120,    
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: `Write a commit message for this diff:\n\n${truncated}` },
    ],
  });

  return response.choices[0].message.content.trim();
}

module.exports = { commitComposer };
