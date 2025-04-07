/**
 * Environment validation script
 * Checks if all required environment variables are set
 */
require('dotenv').config();

const chalk = require('chalk') || { 
  green: (text) => '\x1b[32m' + text + '\x1b[0m',
  red: (text) => '\x1b[31m' + text + '\x1b[0m',
  yellow: (text) => '\x1b[33m' + text + '\x1b[0m',
  blue: (text) => '\x1b[34m' + text + '\x1b[0m',
  bold: (text) => '\x1b[1m' + text + '\x1b[0m'
};

/**
 * Required environment variables
 * Key: Variable name
 * Value: Description
 */
const requiredVariables = {
  JWT_SECRET: 'Secret key for JWT authentication',
  MONGODB_URI: 'MongoDB connection URI',
  GOOGLE_CLIENT_ID: 'Google OAuth client ID',
  GOOGLE_CLIENT_SECRET: 'Google OAuth client secret',
  GOOGLE_REDIRECT_URI: 'Google OAuth redirect URI'
};

/**
 * Optional environment variables
 * Key: Variable name
 * Value: Description
 */
const optionalVariables = {
  PORT: 'Server port (default: 5001)',
  EMAIL_SYNC_INTERVAL: 'Interval between email syncs in minutes (default: 10)',
  NODE_ENV: 'Environment (development, test, production) (default: development)',
  DEV_TOKEN: 'Development token for bypassing auth in development mode',
  DEV_USER_ID: 'Development user ID for testing',
  DEV_USER_EMAIL: 'Development user email for testing'
};

/**
 * Validate environment variables
 * @returns {boolean} true if all required variables are set
 */
function validateEnvironment() {
  console.log(chalk.bold('\n=== Environment Validation ===\n'));
  
  let allRequiredPresent = true;
  const missingRequired = [];
  const presentRequired = [];
  
  // Check required variables
  console.log(chalk.bold('Required Variables:'));
  for (const [name, description] of Object.entries(requiredVariables)) {
    if (!process.env[name]) {
      console.log(`${chalk.red('✘')} ${chalk.bold(name)}: ${description}`);
      missingRequired.push(name);
      allRequiredPresent = false;
    } else {
      const valuePreview = process.env[name].substring(0, 3) + '...';
      console.log(`${chalk.green('✓')} ${chalk.bold(name)}: ${description} (${valuePreview})`);
      presentRequired.push(name);
    }
  }
  
  // Check optional variables
  console.log(chalk.bold('\nOptional Variables:'));
  for (const [name, description] of Object.entries(optionalVariables)) {
    if (!process.env[name]) {
      console.log(`${chalk.yellow('○')} ${chalk.bold(name)}: ${description} (not set)`);
    } else {
      console.log(`${chalk.green('✓')} ${chalk.bold(name)}: ${description} (set)`);
    }
  }
  
  // Summary
  console.log(chalk.bold('\nSummary:'));
  console.log(`${chalk.green('✓')} Required variables present: ${presentRequired.length}/${Object.keys(requiredVariables).length}`);
  
  if (missingRequired.length > 0) {
    console.log(`${chalk.red('✘')} Missing required variables: ${missingRequired.join(', ')}`);
    console.log(chalk.red('\nValidation FAILED! Please fix the missing variables in your .env file.\n'));
  } else {
    console.log(chalk.green('\nValidation PASSED! All required environment variables are set.\n'));
  }
  
  return allRequiredPresent;
}

// Run validation
const isValid = validateEnvironment();

// Exit with proper code for CI/CD pipelines
if (!isValid && process.env.NODE_ENV === 'production') {
  process.exit(1);
}

module.exports = { validateEnvironment };