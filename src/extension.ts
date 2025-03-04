import * as vscode from 'vscode';
import { GoogleGenerativeAI } from '@google/generative-ai';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI LaTeX Extension is now active');

    const config = vscode.workspace.getConfiguration('ai-latex-helper');
    let apiKey = config.get<string>('apiKey') || '';
    let debounceDelay = config.get<number>('debounceDelay') || 1000;
    let isEnabled = config.get<boolean>('enabled') ?? true;

    let genAI = new GoogleGenerativeAI(apiKey);
    let model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    let timeout: NodeJS.Timeout | undefined;
    let latexStatusBarItem: vscode.StatusBarItem;

    latexStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    updateStatusBarText();
    context.subscriptions.push(latexStatusBarItem);
    latexStatusBarItem.show();

    const latexCandidateDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: vscode.workspace.getConfiguration().get('editor.selectionBackground'),
        border: `1px solid ${vscode.workspace.getConfiguration().get('editor.selectionBackground')}`,
        borderRadius: '3px'
    });

    function updateStatusBarText() {
        if (isEnabled) {
            latexStatusBarItem.text = "$(check) AI LaTeX Helper";
            latexStatusBarItem.tooltip = "AI LaTeX suggestions enabled (click to disable)";
        } else {
            latexStatusBarItem.text = "$(x) AI LaTeX Helper";
            latexStatusBarItem.tooltip = "AI LaTeX suggestions disabled (click to enable)";
        }

        latexStatusBarItem.command = 'extension.toggleAILaTeXHelper';
    }

    const generateLaTeX = async (text: string): Promise<string | null> => {
        if (!apiKey || apiKey.trim() === '') {
            vscode.window.showErrorMessage('Please set your API key in settings (ai-latex-helper.apiKey)');
            return null;
        }

        try {
            const systemInstructions = `Convert the given English text description into a LaTeX equation. 
            Follow these formatting rules:
            1. If this doesn't describe a mathematical expression, return "NOT_MATH"
            2. If it does describe a mathematical expression, format it as just the raw LaTeX without dollar signs or quotes
            3. Don't include any explanations, just return the formatted LaTeX.
            
            Example 1: "the quadratic formula"
            Response: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
            
            Example 2: "integral of x squared"
            Response: "\\int x^2 dx"
            
            Example 3: "I need to buy groceries later"
            Response: "NOT_MATH"`;

            const result = await model.generateContent([
                systemInstructions,
                `Convert to LaTeX: ${text}`
            ]);
            const response = await result.response;
            const latex = response.text();

            if (latex.includes("NOT_MATH")) {
                return null;
            }

            return latex.trim();
        } catch (error) {
            console.error('Error generating LaTeX:', error);
            return null;
        }
    };

    const isInsideLatexFormula = (document: vscode.TextDocument, position: vscode.Position): boolean => {
        const line = document.lineAt(position.line).text;

        const textBeforeCursor = line.substring(0, position.character);
        const dollarsBefore = textBeforeCursor.split('$').length - 1;

        const textAfterCursor = line.substring(position.character);
        const dollarsAfter = textAfterCursor.split('$').length - 1;

        return (dollarsBefore > 0 && dollarsAfter > 0) || (dollarsBefore % 2 === 1);
    };

    const getCurrentFormula = (document: vscode.TextDocument, position: vscode.Position): { text: string, range: vscode.Range } | null => {
        const line = document.lineAt(position.line).text;
        const currentLineUntilCursor = line.substring(0, position.character);

        const lastDollarIndex = currentLineUntilCursor.lastIndexOf('$');

        if (lastDollarIndex === -1) {
            return null;
        }

        const formulaText = currentLineUntilCursor.substring(lastDollarIndex + 1);

        if (!formulaText.trim()) {
            return null;
        }

        const range = new vscode.Range(
            new vscode.Position(position.line, lastDollarIndex + 1),
            position
        );

        return { text: formulaText, range: range };
    };

    const completionProvider = vscode.languages.registerCompletionItemProvider(
        { language: 'markdown', scheme: 'file' },
        {
            async provideCompletionItems(document, position, token, context) {
                if (!isEnabled) {
                    return null;
                }

                if (!isInsideLatexFormula(document, position)) {
                    return null;
                }

                const currentFormula = getCurrentFormula(document, position);
                if (!currentFormula) {
                    return null;
                }

                const latex = await generateLaTeX(currentFormula.text);
                if (!latex) {
                    return null;
                }

                const completionItem = new vscode.CompletionItem('LaTeX: ' + latex, vscode.CompletionItemKind.Snippet);
                completionItem.insertText = latex + '$';
                completionItem.documentation = new vscode.MarkdownString(`**LaTeX formula for:** "${currentFormula.text}"\\\n$${latex}$`);
                completionItem.detail = 'AI-generated LaTeX';
                completionItem.sortText = '0';
                completionItem.range = currentFormula.range;
                completionItem.preselect = true;
                completionItem.filterText = currentFormula.text;

                return [completionItem];
            }
        },
        '$'
    );

    const onTextDocumentChange = async (event: vscode.TextDocumentChangeEvent) => {
        if (!isEnabled || !event.document.fileName.endsWith('.md')) {
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document !== event.document) {
            return;
        }

        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(async () => {
            try {
                const position = editor.selection.active;

                if (!isInsideLatexFormula(editor.document, position)) {
                    editor.setDecorations(latexCandidateDecoration, []);
                    return;
                }

                const currentFormula = getCurrentFormula(editor.document, position);
                if (!currentFormula) {
                    editor.setDecorations(latexCandidateDecoration, []);
                    return;
                }

                editor.setDecorations(latexCandidateDecoration, [currentFormula.range]);

                await vscode.commands.executeCommand('editor.action.triggerSuggest');
            } catch (error) {
                console.error('Error processing text:', error);
            }
        }, debounceDelay);
    };

    const toggleCommand = vscode.commands.registerCommand('extension.toggleAILaTeXHelper', () => {
        isEnabled = !isEnabled;
        vscode.workspace.getConfiguration('ai-latex-helper').update('enabled', isEnabled, true);
        updateStatusBarText();
        vscode.window.showInformationMessage(`AI LaTeX Helper suggestions ${isEnabled ? 'enabled' : 'disabled'}`);
    });

    const convertCommand = vscode.commands.registerCommand('extension.convertToLaTeX', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document.fileName.endsWith('.md')) {
            vscode.window.showInformationMessage('Please open a Markdown file to use LaTeX generation.');
            return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection);

        if (text.trim().length === 0) {
            vscode.window.showInformationMessage('Please select text to convert to LaTeX.');
            return;
        }

        const latex = await generateLaTeX(text);

        if (latex) {
            editor.edit(editBuilder => {
                editBuilder.replace(selection, `$${latex}$`);
            });
        } else {
            vscode.window.showInformationMessage('The selected text doesn\'t appear to be a mathematical expression.');
        }
    });

    const configListener = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('ai-latex-helper')) {
            const newConfig = vscode.workspace.getConfiguration('ai-latex-helper');

            const newApiKey = newConfig.get<string>('apiKey') || '';
            if (newApiKey !== apiKey) {
                apiKey = newApiKey;
                genAI = new GoogleGenerativeAI(apiKey);
                model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            }

            debounceDelay = newConfig.get<number>('debounceDelay') || 1000;

            const newIsEnabled = newConfig.get<boolean>('enabled') ?? true;
            if (newIsEnabled !== isEnabled) {
                isEnabled = newIsEnabled;
                updateStatusBarText();
            }
        }
    });

    const changeListener = vscode.workspace.onDidChangeTextDocument(onTextDocumentChange);

    context.subscriptions.push(
        convertCommand,
        toggleCommand,
        completionProvider,
        changeListener,
        configListener,
        latexStatusBarItem
    );
}

export function deactivate() { }