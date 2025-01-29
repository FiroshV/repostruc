#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const INDENT = '  ';
const BRANCH = '├── ';
const LAST_BRANCH = '└── ';
const PIPE = '│   ';
const SPACE = '    ';

function getDirectoryStructure(dir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const filtered = entries.filter(entry => !entry.name.startsWith('.') && entry.name !== 'node_modules');
  
  filtered.forEach((entry, index) => {
    const isLast = index === filtered.length - 1;
    const branch = isLast ? LAST_BRANCH : BRANCH;
    const newPrefix = prefix + (isLast ? SPACE : PIPE);
    
    if (entry.isDirectory()) {
      console.log(prefix + branch + chalk.blue(entry.name));
      getDirectoryStructure(path.join(dir, entry.name), newPrefix);
    } else {
      console.log(prefix + branch + entry.name);
    }
  });
}

try {
  const currentDir = process.cwd();
  console.log(chalk.green(path.basename(currentDir)));
  getDirectoryStructure(currentDir);
} catch (error) {
  console.error(chalk.red('Error reading directory structure:'), error.message);
  process.exit(1);
}