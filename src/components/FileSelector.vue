<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-colors">
    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">选择文件</h2>
    <input
      type="file"
      accept=".txt"
      class="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-900/30 dark:file:text-emerald-400 hover:file:bg-emerald-100 dark:hover:file:bg-emerald-900/50 cursor-pointer"
      @change="$emit('update:selectedFile', $event.target.files[0])"
    >
    <p v-if="selectedFile" class="mt-3 text-sm text-gray-600 dark:text-gray-400">
      已选择文件: {{ selectedFile.name }}
    </p>

    <div v-if="selectedFile && previewContent" class="mt-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">文件预览</h3>
        <div class="flex items-center gap-2">
          <label class="text-sm text-gray-500 dark:text-gray-400">编码：</label>
          <select
            :value="selectedEncoding"
            class="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            @change="$emit('update:selectedEncoding', $event.target.value)"
          >
            <option v-for="enc in availableEncodings" :key="enc" :value="enc">{{ enc }}</option>
          </select>
        </div>
      </div>
      <pre class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words max-h-48 overflow-y-auto font-serif leading-relaxed">{{ previewContent }}</pre>
    </div>
  </div>
</template>

<script setup>
defineProps({
  selectedFile: Object,
  previewContent: String,
  selectedEncoding: String,
  availableEncodings: Array,
})

defineEmits(['update:selectedFile', 'update:selectedEncoding'])
</script>
