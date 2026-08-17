// scripts/export-source.js
// プロジェクトのソースコードを1つのMarkdownファイルにまとめて書き出します。
// 実行方法: node scripts/export-source.js

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const OUTPUT_FILE = path.join(ROOT, 'vibrun-meal-app-source-latest.md');

// 走査するフォルダ(この中の対象拡張子ファイルをすべて集める)
const TARGET_DIRS = ['api', 'lib', 'src'];

// フォルダとは別に、個別に含めたいルート直下のファイル
const ROOT_FILES = [
  'package.json',
  'vite.config.js',
  'tailwind.config.js',
  'postcss.config.js',
  'index.html',
];

const EXTENSIONS = ['.js', '.jsx', '.css', '.html', '.json'];

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(fullPath, files);
    } else if (EXTENSIONS.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function langFor(filePath) {
  const ext = path.extname(filePath);
  if (ext === '.jsx') return 'jsx';
  if (ext === '.js') return 'js';
  if (ext === '.css') return 'css';
  if (ext === '.html') return 'html';
  if (ext === '.json') return 'json';
  return '';
}

let allFiles = [];
for (const dir of TARGET_DIRS) {
  const fullDir = path.join(ROOT, dir);
  if (fs.existsSync(fullDir)) {
    walk(fullDir, allFiles);
  }
}
for (const file of ROOT_FILES) {
  const fullPath = path.join(ROOT, file);
  if (fs.existsSync(fullPath)) {
    allFiles.push(fullPath);
  }
}

allFiles = allFiles.map((f) => path.relative(ROOT, f)).sort();

let output = `# vibrun-meal-app ソースコード一式(自動生成)\n\n`;
output += `書き出し日時: ${new Date().toLocaleString('ja-JP')}\n\n`;
output += `## ファイル一覧\n\n`;
for (const relPath of allFiles) {
  output += `- ${relPath}\n`;
}
output += `\n---\n\n`;

for (const relPath of allFiles) {
  const content = fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
  output += `## ${relPath}\n\n`;
  output += '```' + langFor(relPath) + '\n';
  output += content;
  if (!content.endsWith('\n')) output += '\n';
  output += '```\n\n';
}

fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
console.log(`書き出し完了: ${OUTPUT_FILE}`);
console.log(`対象ファイル数: ${allFiles.length}`);