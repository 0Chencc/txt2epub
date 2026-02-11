import JSZip from 'jszip'

export function escapeXml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const CN_NUM = '0-9零一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟'

// 章节格式候选：{ pattern, min } — min 为最少命中次数
// 高置信度（第X章等）min=1，低置信度（纯数字）min=2
const CHAPTER_CANDIDATES = [
  { pattern: new RegExp(`^第[${CN_NUM}]+[章回节節卷集部篇]`), min: 1 },
  { pattern: new RegExp(`^卷[${CN_NUM}]+`), min: 1 },
  { pattern: /^[Cc]hapter\s+\d+/, min: 1 },
  { pattern: new RegExp(`^[（(]\\s*[${CN_NUM}]+\\s*[）)]`), min: 2 },
  { pattern: /^【[^】]{1,20}】/, min: 2 },
  { pattern: /^\d{1,4}[.、．]\s*\S/, min: 2 },
]

// 特殊标题，单次出现即识别
const SPECIAL_TITLE = /^(?:序章|序言|楔子|引子|前言|后记|後記|尾声|尾聲|番外|终章|終章|附录|附錄|上篇|中篇|下篇)(?:\s.*|[：:].+)?$/

function detectPattern(lines) {
  for (const { pattern, min } of CHAPTER_CANDIDATES) {
    let count = 0
    for (const line of lines) {
      if (pattern.test(line.trim()) && ++count >= min) return pattern
    }
  }
  return null
}

export function parseChapters(text) {
  const lines = text.split(/\r?\n/)
  const pattern = detectPattern(lines)

  const chapters = []
  let currentChapter = { title: '序章', content: [] }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if ((pattern && pattern.test(line)) || SPECIAL_TITLE.test(line)) {
      chapters.push(currentChapter)
      currentChapter = { title: line, content: [] }
    } else {
      currentChapter.content.push(line)
    }
  }
  chapters.push(currentChapter)

  return chapters.filter(ch => ch.content.length > 0)
}

export async function buildEpub({ chapters, title, options, coverFile }) {
  const zip = new JSZip()

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  const metaInf = zip.folder('META-INF')
  metaInf.file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`)

  const oebps = zip.folder('OEBPS')

  let coverImagePath = null
  if (coverFile) {
    const coverImage = await coverFile.arrayBuffer()
    const coverExt = coverFile.name.split('.').pop().toLowerCase()
    coverImagePath = `images/cover.${coverExt}`
    oebps.folder('images').file(`cover.${coverExt}`, coverImage)
  }

  const manifestItems = []
  const spineItems = []
  const navPoints = []

  const cssContent = `body {
  font-family: "SimSun", "宋体", serif;
  font-size: ${options.fontSize}px;
  line-height: ${options.lineHeight};
  margin: ${options.margin}px;
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
}`

  oebps.file('style.css', cssContent)
  manifestItems.push('<item id="style" href="style.css" media-type="text/css"/>')

  chapters.forEach((chapter, index) => {
    const chapterId = `chapter-${index + 1}`
    const chapterFileName = `${chapterId}.html`

    const formattedContent = chapter.content.map(line => {
      const trimmedLine = line.replace(/^[ \t]+/, '')
      return `<p>${escapeXml(trimmedLine)}</p>`
    }).join('\n')

    const chapterHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="zh-CN">
<head>
  <title>${escapeXml(chapter.title)}</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <section class="chapter" epub:type="chapter">
    <h1>${escapeXml(chapter.title)}</h1>
    <div class="chapter-content">
      ${formattedContent}
    </div>
  </section>
</body>
</html>`

    oebps.file(chapterFileName, chapterHtml)
    manifestItems.push(`<item id="${chapterId}" href="${chapterFileName}" media-type="application/xhtml+xml"/>`)
    spineItems.push(`<itemref idref="${chapterId}"/>`)

    navPoints.push(`<navPoint id="navpoint-${index + 1}" playOrder="${index + 1}">
      <navLabel>
        <text>${escapeXml(chapter.title)}</text>
      </navLabel>
      <content src="${chapterFileName}"/>
    </navPoint>`)
  })

  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })

  oebps.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf" xmlns:calibre="http://calibre.kovidgoyal.net/2009/metadata">
    <dc:title>${escapeXml(title)}</dc:title>
    ${options.author ? `<dc:creator id="creator">${escapeXml(options.author)}</dc:creator>
    <meta refines="#creator" property="role" scheme="marc:relators">aut</meta>
    <meta refines="#creator" property="file-as">${escapeXml(options.author)}</meta>` : ''}
    <dc:language>zh-CN</dc:language>
    <dc:identifier id="BookId">urn:uuid:${uuid}</dc:identifier>
    <dc:date>${new Date().toISOString()}</dc:date>
    <dc:format>application/epub+zip</dc:format>
    <dc:type>Text</dc:type>
    <meta property="dcterms:modified">${new Date().toISOString()}</meta>
    <meta property="calibre:title_sort">${escapeXml(title)}</meta>
    ${coverImagePath ? '<meta name="cover" content="cover-image"/>' : ''}
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
</package>`)

  oebps.file('toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="zh-CN">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
    <meta name="dtb:generator" content="txt2epub"/>
  </head>
  <docTitle>
    <text>${escapeXml(title)}</text>
  </docTitle>
  <docAuthor>
    <text>${escapeXml(options.author || '')}</text>
  </docAuthor>
  <navMap>
    ${navPoints.join('\n    ')}
  </navMap>
</ncx>`)

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  })
}
