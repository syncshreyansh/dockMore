import ora from 'ora';

export async function withProgress(label, operation, messages = {}) {
  const spinner = ora(label);
  let started = false;
  let settled = false;
  const delay = Number.isFinite(messages.delay) ? messages.delay : 180;
  const timer = setTimeout(() => {
    if (settled) return;
    started = true;
    spinner.start();
  }, delay);

  try {
    const result = await operation(spinner);
    settled = true;
    clearTimeout(timer);
    if (started) {
      if (messages.success === false) spinner.stop();
      else spinner.succeed(messages.success || `${label} complete`);
    }
    return result;
  } catch (error) {
    settled = true;
    clearTimeout(timer);
    if (started) {
      if (messages.failure === false) spinner.stop();
      else spinner.fail(messages.failure || `${label} failed`);
    }
    throw error;
  }
}
