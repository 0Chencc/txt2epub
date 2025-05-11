<template>
  <div id="app">
    <header>
      <h1>TXT与EPUB转换工具</h1>
      <div class="header-info">
        <p class="description">一个简单易用的TXT转EPUB工具，支持自定义字体、行距和边距</p>
        <div class="badges">
          <a href="https://github.com/0chencc/txt2epub" target="_blank" rel="noopener noreferrer">
            <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/0chencc/txt2epub">
          </a>
          <a href="https://twitter.com/0chencc" target="_blank" rel="noopener noreferrer">
            <img alt="X (formerly Twitter) Follow" src="https://img.shields.io/twitter/follow/0chencc">
          </a>
        </div>
      </div>
    </header>
    <main>
      <div class="converter-container">
        <div class="file-section">
          <h2>选择文件</h2>
          <div class="file-input">
            <input type="file" ref="fileInput" @change="handleFileSelect" accept=".txt">
          </div>
          <p v-if="selectedFile">已选择文件: {{ selectedFile.name }}</p>
        </div>

        <div class="preview-section" v-if="isTxtFile && fileContent">
          <h2>文件预览</h2>
          <div class="encoding-selector">
            <label>文件编码：</label>
            <select v-model="selectedEncoding" @change="updatePreview">
              <option v-for="enc in availableEncodings" :key="enc" :value="enc">{{ enc }}</option>
            </select>
          </div>
          <div class="preview-content">
            <pre>{{ previewContent }}</pre>
          </div>
        </div>

        <div class="conversion-options" v-if="selectedFile">
          <h2>转换选项</h2>
          <div class="options-form">
            <div class="form-group" v-if="isTxtFile">
              <label>书名</label>
              <input type="text" v-model="options.title" placeholder="留空则使用文件名">
            </div>
            <div class="form-group" v-if="isTxtFile">
              <label>作者</label>
              <input type="text" v-model="options.author" placeholder="可选">
            </div>
            <div class="form-group" v-if="isTxtFile">
              <label>封面图片</label>
              <input type="file" @change="handleCoverSelect" accept="image/*">
            </div>
            <div class="form-group" v-if="isTxtFile">
              <label>字体大小</label>
              <input type="number" v-model="options.fontSize" min="12" max="24">
            </div>
            <div class="form-group" v-if="isTxtFile">
              <label>行间距</label>
              <input type="number" v-model="options.lineHeight" min="1" max="2" step="0.1">
            </div>
            <div class="form-group" v-if="isTxtFile">
              <label>页边距</label>
              <input type="number" v-model="options.margin" min="10" max="50">
            </div>
          </div>
          <button @click="convertFile" :disabled="converting">
            {{ converting ? '转换中...' : '开始转换' }}
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import ePub from 'epubjs';
import JSZip from 'jszip';
import iconv from 'iconv-lite';

export default {
  name: 'App',
  data() {
    return {
      selectedFile: null,
      coverFile: null,
      converting: false,
      fileContent: null,
      selectedEncoding: 'UTF-8',
      availableEncodings: ['UTF-8', 'GBK', 'GB2312', 'BIG5', 'Shift_JIS', 'EUC-JP', 'EUC-KR'],
      options: {
        title: '',
        author: '',
        fontSize: 16,
        lineHeight: 1.5,
        margin: 20
      }
    }
  },
  computed: {
    isTxtFile() {
      return this.selectedFile && this.selectedFile.name.toLowerCase().endsWith('.txt')
    },
    previewContent() {
      if (!this.fileContent) return '';
      return this.fileContent.slice(0, 200) + (this.fileContent.length > 200 ? '...' : '');
    }
  },
  methods: {
    async handleFileSelect(event) {
      this.selectedFile = event.target.files[0];
      if (this.isTxtFile) {
        await this.loadAndDetectEncoding();
      }
    },
    async loadAndDetectEncoding() {
      try {
        // 默认使用 UTF-8 尝试读取
        const text = await this.selectedFile.text();
        this.fileContent = text;
        
        // 检查是否包含乱码字符
        const hasGarbledText = /[\uFFFD]/.test(text) || /[^\x20-\x7E\u4E00-\u9FA5\u3000-\u303F\uFF00-\uFFEF]/.test(text);
        if (hasGarbledText) {
          // 如果检测到乱码，默认切换到 GBK
          this.selectedEncoding = 'GBK';
          await this.updatePreview();
        } else {
          this.selectedEncoding = 'UTF-8';
        }
      } catch (error) {
        console.error('Error loading file:', error);
        // 如果 UTF-8 读取失败，尝试使用 GBK
        try {
          const arrayBuffer = await this.selectedFile.arrayBuffer();
          const buffer = new Uint8Array(arrayBuffer);
          const text = iconv.decode(buffer, 'gbk');
          this.fileContent = text;
          this.selectedEncoding = 'GBK';
        } catch (gbkError) {
          console.error('Error loading file with GBK:', gbkError);
          alert('加载文件失败，请尝试手动选择正确的编码格式');
        }
      }
    },
    async updatePreview() {
      try {
        if (this.selectedEncoding === 'UTF-8') {
          const text = await this.selectedFile.text();
          this.fileContent = text;
        } else {
          const arrayBuffer = await this.selectedFile.arrayBuffer();
          const buffer = new Uint8Array(arrayBuffer);
          const text = iconv.decode(buffer, this.selectedEncoding.toLowerCase());
          this.fileContent = text;
        }
      } catch (error) {
        console.error('Error updating preview:', error);
        alert('更新预览失败，请重试');
      }
    },
    handleCoverSelect(event) {
      this.coverFile = event.target.files[0];
    },
    async convertFile() {
      if (!this.selectedFile) return;

      this.converting = true;
      try {
        if (this.isTxtFile) {
          await this.convertTxtToEpub();
        } else {
          await this.convertEpubToTxt();
        }
      } catch (error) {
        console.error('转换失败:', error);
        alert('转换失败，请重试');
      } finally {
        this.converting = false;
      }
    },
    async convertTxtToEpub() {
      try {
        let text;
        if (this.selectedEncoding === 'UTF-8') {
          text = await this.selectedFile.text();
        } else {
          const arrayBuffer = await this.selectedFile.arrayBuffer();
          const buffer = new Uint8Array(arrayBuffer);
          text = iconv.decode(buffer, this.selectedEncoding.toLowerCase());
        }
        
        const title = this.options.title || this.selectedFile.name.replace('.txt', '');
        
        // 处理文本内容，识别章节
        const lines = text.split(/\r?\n/);
        const chapters = [];
        let currentChapter = {
          title: '序章',
          content: []
        };
        
        // 章节标题的正则表达式
        const chapterPattern = /^第[0-9零一二三四五六七八九十百千万]+章\s*[^\n]+$/;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // 跳过空行
          if (!line) continue;
          
          // 检查是否是章节标题
          if (chapterPattern.test(line)) {
            // 如果当前章节有内容，保存它
            if (currentChapter.content.length > 0) {
              chapters.push(currentChapter);
            }
            // 创建新章节
            currentChapter = {
              title: line,
              content: []
            };
          } else {
            // 检查是否是段落（有缩进或空行分隔）
            if (line.startsWith('    ') || line.startsWith('\t') || 
                (i > 0 && !lines[i-1].trim())) {
              currentChapter.content.push(line);
            }
          }
        }
        
        // 添加最后一章
        if (currentChapter.content.length > 0) {
          chapters.push(currentChapter);
        }
        
        // 创建 EPUB 文件结构
        const zip = new JSZip();
        
        // 添加 mimetype 文件
        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
        
        // 创建 META-INF 目录
        const metaInf = zip.folder('META-INF');
        metaInf.file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);
        
        // 创建 OEBPS 目录
        const oebps = zip.folder('OEBPS');
        
        // 处理封面图片
        let coverImagePath = null;
        if (this.coverFile) {
          const coverImage = await this.coverFile.arrayBuffer();
          const coverExt = this.coverFile.name.split('.').pop().toLowerCase();
          coverImagePath = `images/cover.${coverExt}`;
          const imagesFolder = oebps.folder('images');
          imagesFolder.file(`cover.${coverExt}`, coverImage);
        }
        
        // 生成章节文件
        const manifestItems = [];
        const spineItems = [];
        const navPoints = [];
        
        // 添加样式文件
        const cssContent = `body {
          font-family: "SimSun", "宋体", serif;
          font-size: ${this.options.fontSize}px;
          line-height: ${this.options.lineHeight};
          margin: ${this.options.margin}px;
          text-align: justify;
        }
        p {
          margin: 0;
          padding: 0;
          text-indent: 2em;
        }
        h1 {
          text-align: center;
          margin: 2em 0;
          font-size: 1.5em;
        }`;
        
        oebps.file('style.css', cssContent);
        manifestItems.push('<item id="style" href="style.css" media-type="text/css"/>');
        
        // 生成每个章节的HTML文件
        chapters.forEach((chapter, index) => {
          const chapterId = `chapter-${index + 1}`;
          const chapterFileName = `${chapterId}.html`;
          
          // 格式化章节内容
          const formattedContent = chapter.content.map(line => {
            // 移除开头的缩进
            const trimmedLine = line.replace(/^[ \t]+/, '');
            // 确保每行都是有效的HTML
            return `<p>${this.escapeXml(trimmedLine)}</p>`;
          }).join('\n');
          
          // 创建章节HTML文件
          const chapterHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="zh-CN">
<head>
  <title>${this.escapeXml(chapter.title)}</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <section class="chapter" epub:type="chapter">
    <h1>${this.escapeXml(chapter.title)}</h1>
    <div class="chapter-content">
      ${formattedContent}
    </div>
  </section>
</body>
</html>`;
          
          oebps.file(chapterFileName, chapterHtml);
          manifestItems.push(`<item id="${chapterId}" href="${chapterFileName}" media-type="application/xhtml+xml"/>`);
          spineItems.push(`<itemref idref="${chapterId}"/>`);
          
          // 添加导航点
          navPoints.push(`<navPoint id="navpoint-${index + 1}" playOrder="${index + 1}">
      <navLabel>
        <text>${this.escapeXml(chapter.title)}</text>
      </navLabel>
      <content src="${chapterFileName}"/>
    </navPoint>`);
        });
        
        // 添加 content.opf
        oebps.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf" xmlns:calibre="http://calibre.kovidgoyal.net/2009/metadata">
    <dc:title>${this.escapeXml(title)}</dc:title>
    ${this.options.author ? `<dc:creator id="creator">${this.escapeXml(this.options.author)}</dc:creator>
    <meta refines="#creator" property="role" scheme="marc:relators">aut</meta>
    <meta refines="#creator" property="file-as">${this.escapeXml(this.options.author)}</meta>` : ''}
    <dc:language>zh-CN</dc:language>
    <dc:identifier id="BookId">urn:uuid:${crypto.randomUUID()}</dc:identifier>
    <dc:date>${new Date().toISOString()}</dc:date>
    <dc:format>application/epub+zip</dc:format>
    <dc:type>Text</dc:type>
    <meta property="dcterms:modified">${new Date().toISOString()}</meta>
    <meta property="calibre:title_sort">${this.escapeXml(title)}</meta>
    ${coverImagePath ? `<meta name="cover" content="cover-image"/>` : ''}
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
  <guide>
    <reference type="toc" title="目录" href="toc.ncx"/>
  </guide>
</package>`);
        
        // 添加 toc.ncx
        oebps.file('toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="zh-CN">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${crypto.randomUUID()}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
    <meta name="dtb:generator" content="txt2epub"/>
  </head>
  <docTitle>
    <text>${this.escapeXml(title)}</text>
  </docTitle>
  <docAuthor>
    <text>${this.escapeXml(this.options.author || '')}</text>
  </docAuthor>
  <navMap>
    ${navPoints.join('\n    ')}
  </navMap>
</ncx>`);
        
        // 生成 EPUB 文件
        const epubBlob = await zip.generateAsync({ 
          type: 'blob', 
          mimeType: 'application/epub+zip',
          compression: 'DEFLATE',
          compressionOptions: {
            level: 9
          }
        });
        
        // 创建下载链接
        const url = URL.createObjectURL(epubBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.epub`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error converting file:', error);
        throw error;
      }
    },
    // 添加 XML 转义方法
    escapeXml(unsafe) {
      return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    },
    async convertEpubToTxt() {
      try {
        const book = ePub(this.selectedFile);
        
        // 等待书籍加载完成
        await book.ready;
        
        let text = '';
        
        // 尝试获取并处理封面
        try {
          const cover = await book.cover;
          if (cover) {
            text += '封面\n\n';
          }
        } catch (coverError) {
          console.warn('无法加载封面:', coverError);
        }
        
        // 获取目录信息
        const toc = await book.navigation.toc;
        
        // 处理每个章节
        for (const item of toc) {
          try {
            // 获取章节内容
            const chapter = await book.spine.get(item.href);
            if (!chapter) {
              console.warn(`未找到章节: ${item.href}`);
              continue;
            }

            // 使用 epubjs 的 render 方法获取章节内容
            const content = await chapter.render();
            if (!content) {
              console.warn(`章节内容为空: ${item.href}`);
              continue;
            }
            
            // 创建临时容器来解析内容
            const container = document.createElement('div');
            container.innerHTML = content;
            
            // 获取章节标题
            const chapterTitle = item.label || container.querySelector('h1')?.textContent || '';
            
            // 添加章节标题
            if (chapterTitle) {
              text += chapterTitle + '\n\n';
            }
            
            // 获取所有段落
            const paragraphs = Array.from(container.querySelectorAll('p'));
            
            // 处理段落
            paragraphs.forEach(p => {
              const paragraphText = p.textContent.trim();
              if (paragraphText) {
                // 添加段落缩进
                text += '    ' + paragraphText + '\n\n';
              }
            });
            
            // 处理子章节
            if (item.subitems && item.subitems.length > 0) {
              for (const subitem of item.subitems) {
                try {
                  const subchapter = await book.spine.get(subitem.href);
                  if (!subchapter) {
                    console.warn(`未找到子章节: ${subitem.href}`);
                    continue;
                  }

                  // 使用 epubjs 的 render 方法获取子章节内容
                  const subcontent = await subchapter.render();
                  if (!subcontent) {
                    console.warn(`子章节内容为空: ${subitem.href}`);
                    continue;
                  }
                  
                  // 创建临时容器来解析子章节内容
                  const subcontainer = document.createElement('div');
                  subcontainer.innerHTML = subcontent;
                  
                  // 获取子章节标题
                  const subchapterTitle = subitem.label || subcontainer.querySelector('h1')?.textContent || '';
                  
                  // 添加子章节标题
                  if (subchapterTitle) {
                    text += subchapterTitle + '\n\n';
                  }
                  
                  // 获取所有段落
                  const subparagraphs = Array.from(subcontainer.querySelectorAll('p'));
                  
                  // 处理段落
                  subparagraphs.forEach(p => {
                    const paragraphText = p.textContent.trim();
                    if (paragraphText) {
                      // 添加段落缩进
                      text += '    ' + paragraphText + '\n\n';
                    }
                  });
                } catch (subError) {
                  console.warn('处理子章节时出错:', subError);
                  // 继续处理其他子章节
                }
              }
            }
          } catch (chapterError) {
            console.warn('处理章节时出错:', chapterError);
            // 继续处理其他章节
          }
        }
        
        // 创建下载链接
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.selectedFile.name.replace('.epub', '.txt');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('EPUB转TXT时出错:', error);
        throw error;
      }
    }
  }
}
</script>

<style>
#app {
  font-family: Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin: 0;
  padding: 20px;
}

header {
  margin-bottom: 40px;
  text-align: center;
}

.header-info {
  margin-top: 20px;
}

.description {
  color: #666;
  font-size: 1.1em;
  margin-bottom: 15px;
}

.badges {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
}

.badges img {
  height: 20px;
  transition: transform 0.2s;
}

.badges img:hover {
  transform: scale(1.05);
}

.badges a {
  text-decoration: none;
}

.converter-container {
  max-width: 800px;
  margin: 0 auto;
}

.file-section {
  margin-bottom: 30px;
}

.file-input {
  margin: 20px 0;
}

.file-input input[type="file"] {
  padding: 10px;
  border: 2px solid #ccc;
  border-radius: 4px;
  width: 100%;
  max-width: 400px;
}

.preview-section {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  text-align: left;
}

.encoding-selector {
  margin-bottom: 15px;
}

.encoding-selector select {
  padding: 5px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-left: 10px;
}

.preview-content {
  background-color: white;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #ddd;
  max-height: 200px;
  overflow-y: auto;
}

.preview-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: "SimSun", "宋体", serif;
  line-height: 1.5;
}

button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #3aa876;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.conversion-options {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.options-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}

input[type="number"],
input[type="text"] {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style> 