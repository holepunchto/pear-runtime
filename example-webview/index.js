const { Window, WebView } = require('bare-native')
const html = require('./index.html', { with: { type: 'text' } })

function createWindow() {
  const win = new Window(800, 600)
  const webView = new WebView()
  win.content(webView)
  webView.loadHTML(html)
}

createWindow()
