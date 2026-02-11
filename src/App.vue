<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 transition-colors">
    <button
      class="fixed top-4 right-4 p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors z-10"
      @click="toggleDark"
    >
      <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
      </svg>
    </button>
    <div class="max-w-2xl mx-auto">
      <header class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">TXT与EPUB转换工具</h1>
        <p class="text-gray-500 dark:text-gray-400 mb-3">一个简单易用的TXT转EPUB工具，支持自定义字体、行距和边距</p>
        <div class="flex justify-center gap-3">
          <a href="https://github.com/0chencc/txt2epub" target="_blank" rel="noopener noreferrer">
            <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/0chencc/txt2epub" class="h-5 hover:scale-105 transition-transform">
          </a>
          <a href="https://twitter.com/0chencc" target="_blank" rel="noopener noreferrer">
            <img alt="X (formerly Twitter) Follow" src="https://img.shields.io/twitter/follow/0chencc" class="h-5 hover:scale-105 transition-transform">
          </a>
        </div>
      </header>

      <FileSelector
        :selectedFile="selectedFile"
        :previewContent="previewContent"
        :selectedEncoding="selectedEncoding"
        :availableEncodings="availableEncodings"
        @update:selectedFile="handleFileSelect"
        @update:selectedEncoding="handleEncodingChange"
      />

      <ConversionOptions
        v-if="selectedFile"
        :options="options"
        :converting="converting"
        @update:options="options = $event"
        @convert="handleConvert"
        @coverSelected="coverFile = $event"
      />

      <div v-if="errorMessage" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-red-700 dark:text-red-400">转换失败</span>
          <button class="text-red-400 dark:text-red-500 hover:text-red-600 text-sm" @click="errorMessage = ''">关闭</button>
        </div>
        <pre class="text-xs text-red-600 dark:text-red-300 whitespace-pre-wrap break-all select-all">{{ errorMessage }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import FileSelector from './components/FileSelector.vue'
import ConversionOptions from './components/ConversionOptions.vue'
import { useFileEncoding } from './composables/useFileEncoding'
import { parseChapters, buildEpub } from './utils/epub-builder'

const {
  selectedFile,
  previewContent,
  selectedEncoding,
  availableEncodings,
  loadAndDetectEncoding,
  updatePreview,
  readFullContent,
} = useFileEncoding()

const coverFile = ref(null)
const converting = ref(false)
const isDark = ref(false)
const errorMessage = ref('')
const options = ref({
  title: '',
  author: '',
  fontSize: 16,
  lineHeight: 1.5,
  margin: 20,
})

onMounted(() => {
  isDark.value = localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  applyTheme()
})

function applyTheme() {
  document.documentElement.classList.toggle('dark', isDark.value)
}

function toggleDark() {
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  applyTheme()
}

async function handleFileSelect(file) {
  selectedFile.value = file
  if (file && file.name.toLowerCase().endsWith('.txt')) {
    await loadAndDetectEncoding()
  }
}

async function handleEncodingChange(encoding) {
  selectedEncoding.value = encoding
  await updatePreview()
}

async function handleConvert() {
  if (!selectedFile.value) return
  converting.value = true
  errorMessage.value = ''
  try {
    const text = await readFullContent()
    const title = options.value.title || selectedFile.value.name.replace('.txt', '')
    const chapters = parseChapters(text)
    const blob = await buildEpub({
      chapters,
      title,
      options: options.value,
      coverFile: coverFile.value,
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.epub`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('转换失败:', error)
    errorMessage.value = error.message + '\n' + error.stack
  } finally {
    converting.value = false
  }
}
</script>
