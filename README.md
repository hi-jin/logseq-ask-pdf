# Logseq Ask PDF Plugin

A Logseq plugin that allows you to ask questions about PDF highlights (text or images) using Large Language Models (LLMs).

## Demo

![demo](demo.gif)

> [!Note]  
> The demo video uses the following paper as an example:  
>   
> Frans, K., Park, S., Abbeel, P., & Levine, S. (2024). Unsupervised Zero-Shot Reinforcement Learning via Functional Reward Encodings. arXiv preprint arXiv:2402.17135.  
> URL: [https://arxiv.org/abs/2402.17135](https://arxiv.org/abs/2402.17135)  
> This paper is used for **demonstration purposes only** and is not affiliated with this plugin's development.

> [!Important]  
> This plugin is under active development. Contributions and pull requests are highly welcome!

## Features

- Ask questions about PDF highlights directly within Logseq
- Supports asking both text and image highlights
- Use the entire PDF as context
- Seamless integration with Logseq's UI
- Compatible with OpenAI API and local models that are OpenAI API-compatible

## Installation

1. Open Logseq
2. Go to Settings > Plugins
3. Search for "Ask PDF"
4. Click Install

## Configuration

Before using the plugin, you need to set up your API key:

1. Go to the plugin settings
2. Enter your API key (OpenAI or OpenRouter)
3. (Optional) Set the **API Base URL** if you are using OpenRouter (`https://openrouter.ai/api/v1`) or a local model.
4. Click **Check API Key** to verify your configuration.

## Usage

### Ask about a highlight
1. Highlight text or an image in your PDF (and paste it)
2. In Logseq, find the block with the corresponding UUID (it will look like `((uuid-uuid-...))`)
3. Type `/ask pdf` in that block

### Ask a free-text question
1. In a block, type your question (e.g., "What is the main conclusion of this paper?")
2. Type `/ask pdf` in that block

> [!Note]
> You can move your cursor or continue working in Logseq while the response is being generated.

## Changelog

### v0.5.0
- **Local Vector Storage**: Optimized performance by caching vector embeddings locally using IndexedDB. This significantly speeds up subsequent queries for the same PDF.
- **OpenRouter Support**: Added support for OpenRouter API, allowing you to use various models like Claude 3, Llama 3, etc.
- **Free-text Questions**: You can now ask questions directly in a block without needing to reference a specific highlight.
- **Progress Indicator**: Added a real-time progress indicator for the PDF embedding process.
- **API Key Verification**: Added a button in settings to verify your API key and connection.
- **Clear Cache**: Added an option to clear the local vector store cache.

> [!Note]
> You can move your cursor or continue working in Logseq while the response is being generated.

## License

MIT

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/hi-jin/logseq-ask-pdf/issues) on [GitHub](https://github.com/hi-jin/logseq-ask-pdf).
