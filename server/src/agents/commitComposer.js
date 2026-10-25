
'use strict';

const Groq = require('groq-sdk');

function getGroq() {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is required for AI commit generation');
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

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
  
  const files = [...diffText.matchAll(/^diff --git a\/(.+?) b\/(.+)$/gm)].map((match) => match[2]);
  const excerpt = diffText.length > MAX_DIFF_CHARS
    ? `${diffText.slice(0, MAX_DIFF_CHARS)}\n[Commit message context excerpt; complete file list: ${files.join(', ').slice(0, 10000)}]`
    : diffText;

  const response = await getGroq().chat.completions.create({
    model: MODEL,
    temperature: 0.3,   
    max_tokens: 120,    
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: `Write a commit message for this diff:\n\n${excerpt}` },
    ],
  });

  return response.choices[0].message.content.trim();
}

module.exports = { commitComposer };
