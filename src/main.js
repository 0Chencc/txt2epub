import { createApp } from 'vue'
import App from './App.vue'

// 添加 Vue 特性标志
window.__VUE_OPTIONS_API__ = true
window.__VUE_PROD_DEVTOOLS__ = false
window.__VUE_PROD_HYDRATION_MISMATCH_DETAILS__ = false

createApp(App).mount('#app') 