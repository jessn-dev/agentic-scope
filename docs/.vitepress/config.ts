import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "agenticscope",
  description: "A directory-as-context standard plus a read-only MCP server",
  base: "/agentic-scope/", // Required for GitHub Pages if repo name is agentic-scope
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' }
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is agenticscope?', link: '/guide/' },
          { text: 'Getting Started', link: '/guide/getting-started' }
        ]
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'MCP Server', link: '/guide/mcp-server' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/jessn-dev/agentic-scope' }
    ]
  }
})
