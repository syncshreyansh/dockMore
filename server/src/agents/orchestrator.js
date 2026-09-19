

'use strict';

const { commitComposer } = require('./commitComposer');
const { codeGuardian }   = require('./codeGuardian');


async function handleGitpushTrigger(diffText) {
  const [commitMessage, guardianResult] = await Promise.all([
    commitComposer(diffText),
    codeGuardian(diffText),
  ]);

  return {
    commitMessage,
    warnings: guardianResult.warnings,
  };
}

module.exports = { handleGitpushTrigger };
