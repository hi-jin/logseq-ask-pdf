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

Before using the plugin, you need to set up your OpenAI API key:

1. Go to the plugin settings
2. Enter your OpenAI API key or the API key for your local OpenAI-compatible model in the designated field
3. (Optional) If using a local model, set the Embedding Model Host and LLM Model Host to your local server's URL

## Usage

1. Highlight text or an image in your PDF (and paste it)
2. In Logseq, find the block with the corresponding UUID (it will look like `((uuid-uuid-...))`)
3. Type `/ask pdf` in that block
4. Wait for the LLM to generate a response

> [!Note]
> You can move your cursor or continue working in Logseq while the response is being generated.

## License

MIT

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/hi-jin/logseq-ask-pdf/issues) on [GitHub](https://github.com/hi-jin/logseq-ask-pdf).
