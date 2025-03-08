<div align="center">

<img src="https://github.com/abdbbdii/AI-LaTeX-Helper/blob/main/media/icon.png?raw=true" height="150" />

<h1 align="center">AI LaTeX Helper</h1>

[![License](https://img.shields.io/github/license/abdbbdii/AI-LaTeX-Helper?style=flat-square&logo=GNU&label=License)](https://github.com/abdbbdii/AI-LaTeX-Helper/tree/main)
[![GitHub Issues](https://img.shields.io/github/issues/abdbbdii/AI-LaTeX-Helper.svg?style=flat-square&label=Issues&color=FF70A7)](https://github.com/abdbbdii/AI-LaTeX-Helper/issues)
[![Last Commit](https://img.shields.io/github/last-commit/abdbbdii/AI-LaTeX-Helper.svg?style=flat-square&label=Last%20Commit&color=A06EE1)](https://github.com/abdbbdii/AI-LaTeX-Helper/tree/main)
<!-- <br />
[![GitHub Issues](https://img.shields.io/visual-studio-marketplace/stars/abd-dev.AI-LaTeX-Helper?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=abd-dev.AI-LaTeX-Helper)
[![GitHub](https://img.shields.io/visual-studio-marketplace/v/abd-dev.AI-LaTeX-Helper?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=abd-dev.AI-LaTeX-Helper&ssr=false#version-history)
[![GitHub](https://img.shields.io/visual-studio-marketplace/d/abd-dev.AI-LaTeX-Helper?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=abd-dev.AI-LaTeX-Helper&ssr=false#review-details) -->

</div>

The AI LaTeX Helper is a VS Code extension that turns plain English descriptions of math into LaTeX equations using Google Generative AI. Perfect for students, researchers, and writers, it simplifies creating LaTeX without needing to remember the syntax.

![AI LaTeX Helper Animated GIF](https://github.com/abdbbdii/AI-LaTeX-Helper/blob/main/media/other/demo.gif?raw=true)

## Note

To use the AI LaTeX Helper, follow these steps:

1. Obtain a Google Cloud API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Set the API key in the extension settings to enable the AI LaTeX Helper.
3. Ensure you are inside `$...$` in Markdown files to receive LaTeX equation suggestions.

## Features

- **Markdown Support:** Works with Markdown files, allowing you to write LaTeX equations in Markdown with ease.
- **Real-Time LaTeX Suggestions:** As you type, the extension provides instant LaTeX suggestions for mathematical expressions.
- **Intelligent AI-Powered Conversion:** Uses Google's Generative AI to accurately convert natural language into LaTeX.
- **Inline Suggestions:** Displays LaTeX suggestions in a small dropdown menu, allowing you to quickly insert equations just by pressing tab or enter.
- **Customizable Debounce Delay:** Adjust the delay for real-time suggestions to suit your typing speed.

## Requirements

- A stable internet connection is required to use the AI LaTeX Helper extension.
- You must have a Google Cloud API key to use the extension. You can get one at [Google AI Studio](https://aistudio.google.com/apikey).

## Extension Settings

- `ai-latex-helper.apiKey`: API key for Google Generative AI.
- `ai-latex-helper.debounceDelay`: Delay in milliseconds before triggering LaTeX suggestions.
- `ai-latex-helper.enabled`: Enable or disable LaTeX AI suggestions.

## Commands

To access the commands, press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac) to open the command palette and type the following commands:

- **Convert Selection to LaTeX:** `ai-latex-helper.convertToLaTeX`
- **Toggle LaTeX AI Suggestions:** `ai-latex-helper.toggleAILaTeXHelper`

## Key Bindings

- **Convert Selection to LaTeX:** `Ctrl+Alt+L` (Windows/Linux), `Cmd+Alt+L` (Mac)
- **Toggle LaTeX AI Suggestions:** `Ctrl+Alt+T` (Windows/Linux), `Cmd+Alt+T` (Mac)

## Contributing

If you encounter any issues or have suggestions for improvements, please feel free to open an issue or submit a pull request on [GitHub](https://github.com/abdbbdii/AI-LaTeX-Helper).

## Repository

The source code for this extension is available on [GitHub](https://github.com/abdbbdii/AI-LaTeX-Helper).
