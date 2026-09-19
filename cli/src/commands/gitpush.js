import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { simpleGit } from 'simple-git';
import { api } from '../api.js';
import { requireAuth, requireProject } from '../utils.js';

export async function gitpush(options) {
  if (!requireAuth()) return;

  const projectDir = process.cwd();
  const project = requireProject(projectDir);
  if (!project) return;

  
  const git = simpleGit(projectDir);

  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    console.log(chalk.red('  ✗ This directory is not a git repository.'));
    console.log(chalk.dim('  Initialize one with `git init` first.'));
    return;
  }

  const remotes = await git.getRemotes(true);
  if (remotes.length === 0) {
    console.log(chalk.red('  ✗ No git remotes configured.'));
    console.log(chalk.dim('  Add one with `git remote add origin <url>`.'));
    return;
  }

  const spinner = ora('Getting diff...').start();

  try {
    
    let diffText = await git.diff() || '';
    const statusSummary = await git.status();

    if (!diffText && statusSummary.files.length === 0) {
      spinner.info(chalk.yellow('No changes to commit.'));
      return;
    }

    
    if (!diffText && statusSummary.files.length > 0) {
      await git.add('-A');
      diffText = await git.diff(['--cached']);
      await git.reset();
    }

    if (!diffText || diffText.trim().length === 0) {
      spinner.info(chalk.yellow('No diff content to analyze.'));
      return;
    }

    spinner.text = 'AI is analyzing your changes...';

    const result = await api.post(`/api/code-projects/${project.projectId}/generate-commit`, {
      diffText,
    });

    spinner.stop();
    console.log();

    
    if (result.warnings && result.warnings.length > 0) {
      console.log(chalk.yellow.bold('  ⚠ Code Guardian Warnings:'));
      result.warnings.forEach((w) => {
        console.log(chalk.yellow(`    • ${w}`));
      });
      console.log();

      if (!options.auto) {
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Continue with commit despite warnings?',
            default: true,
          },
        ]);
        if (!proceed) {
          console.log(chalk.dim('  Commit cancelled.'));
          return;
        }
      }
    }

    
    console.log(chalk.bold('  📝 AI-Suggested Commit Message:'));
    console.log(chalk.cyan(`  "${result.commitMessage}"`));
    console.log();

    let finalMessage = result.commitMessage;

    if (!options.auto) {
      const { message } = await inquirer.prompt([
        {
          type: 'input',
          name: 'message',
          message: 'Press Enter to accept, or type your own message:',
          default: result.commitMessage,
        },
      ]);
      finalMessage = message || result.commitMessage;
    }

    const commitSpinner = ora('Committing and pushing...').start();

    await git.add('-A');
    await git.commit(finalMessage);

    const currentBranch = (await git.branch()).current;
    await git.push('origin', currentBranch);

    await api.post(`/api/code-projects/${project.projectId}/commit`, {
      commitMessage: finalMessage,
    });

    commitSpinner.succeed(chalk.green('Pushed successfully!'));
    console.log();
    console.log(`  ${chalk.bold('Branch:')}  ${currentBranch}`);
    console.log(`  ${chalk.bold('Message:')} ${finalMessage}`);
    console.log();
  } catch (err) {
    spinner.fail(chalk.red(`gitpush failed: ${err.message}`));
  }
}
