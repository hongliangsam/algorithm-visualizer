// 用于在构建后复制必要的文件，兼容Windows系统
import { promises as fs } from 'fs';
import path from 'path';

async function copyFiles() {
  try {
    // 复制index.html到404.html
    const indexContent = await fs.readFile(path.resolve('dist/index.html'), 'utf-8');
    await fs.writeFile(path.resolve('dist/404.html'), indexContent);

    console.log('文件复制完成: index.html → 404.html');
  } catch (error) {
    console.error('复制文件时出错:', error);
    process.exit(1);
  }
}

copyFiles();