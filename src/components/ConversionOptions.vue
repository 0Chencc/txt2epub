<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-colors">
    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">转换选项</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">书名</label>
        <input
          type="text"
          :value="options.title"
          placeholder="留空则使用文件名"
          class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          @input="updateOption('title', $event.target.value)"
        >
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">作者</label>
        <input
          type="text"
          :value="options.author"
          placeholder="可选"
          class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          @input="updateOption('author', $event.target.value)"
        >
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">封面图片</label>
        <input
          type="file"
          accept="image/*"
          class="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 dark:file:bg-gray-600 dark:file:text-gray-300 hover:file:bg-gray-200 dark:hover:file:bg-gray-500 cursor-pointer"
          @change="$emit('coverSelected', $event.target.files[0])"
        >
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">字体大小</label>
        <input
          type="number"
          :value="options.fontSize"
          min="12"
          max="24"
          class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          @input="updateOption('fontSize', Number($event.target.value))"
        >
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">行间距</label>
        <input
          type="number"
          :value="options.lineHeight"
          min="1"
          max="2"
          step="0.1"
          class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          @input="updateOption('lineHeight', Number($event.target.value))"
        >
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">页边距</label>
        <input
          type="number"
          :value="options.margin"
          min="10"
          max="50"
          class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          @input="updateOption('margin', Number($event.target.value))"
        >
      </div>
    </div>
    <button
      :disabled="converting"
      class="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg py-3 transition-colors"
      @click="$emit('convert')"
    >
      {{ converting ? '转换中...' : '开始转换' }}
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  options: Object,
  converting: Boolean,
})

const emit = defineEmits(['update:options', 'convert', 'coverSelected'])

function updateOption(key, value) {
  emit('update:options', { ...props.options, [key]: value })
}
</script>
