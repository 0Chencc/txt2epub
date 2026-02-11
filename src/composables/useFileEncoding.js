import { ref, computed } from 'vue'
import iconv from 'iconv-lite'

export function useFileEncoding() {
  const selectedFile = ref(null)
  const fileContent = ref(null)
  const selectedEncoding = ref('UTF-8')
  const availableEncodings = ['UTF-8', 'GBK', 'GB2312', 'BIG5', 'Shift_JIS', 'EUC-JP', 'EUC-KR']

  const previewContent = computed(() => {
    if (!fileContent.value) return ''
    return fileContent.value.slice(0, 200) + (fileContent.value.length > 200 ? '...' : '')
  })

  async function loadAndDetectEncoding() {
    try {
      const text = await selectedFile.value.text()
      fileContent.value = text

      const hasGarbledText = /\uFFFD/.test(text)
      if (hasGarbledText) {
        selectedEncoding.value = 'GBK'
        await updatePreview()
      } else {
        selectedEncoding.value = 'UTF-8'
      }
    } catch (error) {
      console.error('Error loading file:', error)
      try {
        const arrayBuffer = await selectedFile.value.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)
        fileContent.value = iconv.decode(buffer, 'gbk')
        selectedEncoding.value = 'GBK'
      } catch (gbkError) {
        console.error('Error loading file with GBK:', gbkError)
        alert('加载文件失败，请尝试手动选择正确的编码格式')
      }
    }
  }

  async function updatePreview() {
    try {
      if (selectedEncoding.value === 'UTF-8') {
        fileContent.value = await selectedFile.value.text()
      } else {
        const arrayBuffer = await selectedFile.value.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)
        fileContent.value = iconv.decode(buffer, selectedEncoding.value.toLowerCase())
      }
    } catch (error) {
      console.error('Error updating preview:', error)
      alert('更新预览失败，请重试')
    }
  }

  async function readFullContent() {
    if (selectedEncoding.value === 'UTF-8') {
      return selectedFile.value.text()
    }
    const arrayBuffer = await selectedFile.value.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)
    return iconv.decode(buffer, selectedEncoding.value.toLowerCase())
  }

  return {
    selectedFile,
    fileContent,
    selectedEncoding,
    availableEncodings,
    previewContent,
    loadAndDetectEncoding,
    updatePreview,
    readFullContent,
  }
}
