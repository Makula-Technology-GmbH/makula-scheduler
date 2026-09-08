process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

process.on('unhandledRejection', err => {
  throw err;
});

const { promisify } = require('util');
const path = require('path');
const exec = promisify(require('child_process').exec);
const fs = require('fs-extra');

async function build() {
  const root = path.resolve(__dirname, '..');
  const sourceDir = path.resolve(root, 'src');
  const targetDir = path.resolve(root, 'dist');
  const typingDir = path.resolve(root, 'typing');
  const jsTarget = targetDir;
  const cssTarget = path.resolve(targetDir, 'css');
  const excludedFolders = ['examples', 'main.jsx'].map(folder => path.join(sourceDir, folder)).join(',');

  try {
    // clean
    console.log('Cleaning...');
    await exec('npx rimraf dist');
    await exec('mkdir dist');

    // transpiling and copy js
    console.log('Transpiling js with babel...');
    await exec(`babel ${sourceDir} --out-dir ${jsTarget} --ignore "${excludedFolders}"`);

    // Ship only scheduler CSS. Do NOT bundle antd's static CSS:
    // antd 5/6 inject component styles via CSS-in-JS. The old build copied a
    // purged antd@4 stylesheet into style.css, which double-paints Popover
    // carets (hourglass arrows) when consumers run antd 6.
    console.log('Copying CSS Files...');
    await fs.copy(`${sourceDir}/css/`, cssTarget);

    console.log('Copying Typescript Files...');
    await fs.copy(`${typingDir}/`, targetDir);

    console.log('Success!');
  } catch (e) {
    console.error('Build process failed:', e.message);
    console.error('Stack trace:', e.stack);
    process.exit(1);
  }
}

build();
