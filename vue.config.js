const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  publicPath: '/txt2epub/',
  transpileDependencies: true,
  configureWebpack: {
    resolve: {
      alias: {
        'vue$': 'vue/dist/vue.esm-bundler.js'
      }
    }
  }
}) 