# Logseq Ask PDF Plugin

A Logseq plugin that allows you to ask questions about PDF highlights (text or images) using Large Language Models (LLMs).

https://github.com/user-attachments/assets/7c04e68b-e76d-48fb-8af0-e2ca4abeab87

## Features

- Ask questions about PDF highlights directly within Logseq
- Supports asking both text and image highlights
- Use the entire PDF as context
- Seamless integration with Logseq's UI

## Installation

1. Open Logseq
2. Go to Settings > Plugins
3. Search for "Ask PDF"
4. Click Install

## Configuration

Before using the plugin, you need to set up your OpenAI API key:

1. Go to the plugin settings
2. Enter your OpenAI API key in the designated field

## Usage

1. Highlight text or an image in your PDF (and paste it)
2. In Logseq, find the block with the corresponding UUID (it will look like `((uuid-uuid-...))`)
3. Type `/ask pdf` in that block
4. Wait for the LLM to generate a response

> **Note:** You can move your cursor or continue working in Logseq while the response is being generated.

## Development Status

This plugin is under active development. Contributions and pull requests are highly welcome!

## License

MIT

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/hi-jin/logseq-ask-pdf-plugin/issues) on GitHub.
