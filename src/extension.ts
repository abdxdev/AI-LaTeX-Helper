import * as vscode from 'vscode';
import { GoogleGenerativeAI } from '@google/generative-ai';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI LaTeX Extension is now active');

    const config = vscode.workspace.getConfiguration('abd-dev');
    let apiKey = config.get<string>('geminiApiKey') || '';
    let modelName = config.get<string>('geminiModel') || 'gemini-2.0-flash-001';

    let genAI = new GoogleGenerativeAI(apiKey);
    let model = genAI.getGenerativeModel({ model: modelName });

    let debounceDelay = vscode.workspace.getConfiguration('ai-latex-helper').get<number>('debounceDelay') || 1000;
    let isEnabled = vscode.workspace.getConfiguration('ai-latex-helper').get<boolean>('enabled') ?? true;

    let timeout: NodeJS.Timeout | undefined;
    let latexStatusBarItem: vscode.StatusBarItem;
    let lastSuggestionTime: number = 0;

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

        latexStatusBarItem.command = 'ai-latex-helper.toggle';
    }

    function isEligibleDocument(document: vscode.TextDocument): boolean {
        // Regular markdown files
        if (document.languageId === 'markdown' && document.uri.scheme === 'file') {
            return true;
        }
        
        if (document.languageId === 'markdown' && document.uri.scheme === 'vscode-notebook-cell') {
            return true;
        }
        
        return false;
    }

    const generateLaTeX = async (text: string): Promise<string | null> => {
        if (!apiKey || apiKey.trim() === '') {
            vscode.window.showErrorMessage('Please set your Gemini API key using the command palette (abd-dev: Set Gemini API Key)');
            return null;
        }

        try {
            const systemInstructions = `Convert the given English text description into a LaTeX equation. 
            Follow these formatting rules:
            1. If this doesn't describe anything that could be expressed in LaTeX notation, return "NOT_MATH"
            2. For mathematical expressions, return just the raw LaTeX without dollar signs or quotes
            3. Don't include any explanations, just return the formatted LaTeX
            4. Accept and process ANY mathematical expression, even if it's mathematically invalid
            5. Don't try to correct mathematical errors, just format them properly in LaTeX
            6. Always generate valid LaTeX syntax even for invalid math
            7. Allow undefined variables and incomplete expressions
            8. Format nonsensical math operations as long as they can be expressed in LaTeX
            
            Examples:
            "divide by zero" -> "\\frac{1}{0}"
            "square root of negative one" -> "\\sqrt{-1}"
            "infinity plus infinity" -> "\\infty + \\infty"
            "zero to the power of zero" -> "0^0"
            "matrix with impossible dimensions" -> "\\begin{pmatrix} a & b \\\\ c & d & e \\end{pmatrix}"
            "log of zero" -> "\\log(0)"
            "undefined integral" -> "\\int e^{x^2} dx"
            "I need coffee" -> "NOT_MATH"`;

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
        [
            { language: 'markdown', scheme: 'file' },
            { language: 'markdown', scheme: 'vscode-notebook-cell' }
            // Removed Python cell support
        ],
        {
            async provideCompletionItems(document, position) {
                if (!isEnabled || !isEligibleDocument(document)) {
                    return null;
                }

                const now = Date.now();
                if (now - lastSuggestionTime < 500) {
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
                completionItem.range = currentFormula.range;

                completionItem.command = {
                    command: 'ai-latex-helper.suggestionAccepted',
                    title: 'Suggestion Accepted'
                };

                return [completionItem];
            }
        },
        '$'
    );


    const onTextDocumentChange = async (event: vscode.TextDocumentChangeEvent) => {
        if (!isEnabled || !isEligibleDocument(event.document)) {
            return;
        }
        
        if (event.document.isDirty) {
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

    const toggleCommand = vscode.commands.registerCommand('ai-latex-helper.toggle', () => {
        isEnabled = !isEnabled;
        vscode.workspace.getConfiguration('ai-latex-helper').update('enabled', isEnabled, true);
        updateStatusBarText();
        vscode.window.showInformationMessage(`AI LaTeX Helper suggestions ${isEnabled ? 'enabled' : 'disabled'}`);
    });

    const suggestionAcceptedCommand = vscode.commands.registerCommand('ai-latex-helper.suggestionAccepted', () => {
        lastSuggestionTime = Date.now();
    });
    context.subscriptions.push(suggestionAcceptedCommand);

    const convertCommand = vscode.commands.registerCommand('ai-latex-helper.convert-to-latex', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor found.');
            return;
        }
        
        if (!isEligibleDocument(editor.document)) {
            vscode.window.showInformationMessage('AI LaTeX Helper only works in Markdown files and Markdown cells in notebooks.');
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

    const setApiKeyCommand = vscode.commands.registerCommand('abd-dev.setApiKey', async () => {
        const newApiKey = await vscode.window.showInputBox({
            prompt: 'Enter your Gemini API Key',
            password: true,
            placeHolder: 'Enter API key from Google AI Studio'
        });

        if (newApiKey) {
            await config.update('geminiApiKey', newApiKey, true);
            apiKey = newApiKey;
            genAI = new GoogleGenerativeAI(apiKey);
            model = genAI.getGenerativeModel({ model: modelName });
            vscode.window.showInformationMessage('Gemini API key has been updated');
        }
    });

    const configListener = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('abd-dev')) {
            const newConfig = vscode.workspace.getConfiguration('abd-dev');

            const newApiKey = newConfig.get<string>('geminiApiKey') || '';
            const newModelName = newConfig.get<string>('geminiModel') || 'gemini-2.0-flash-001';
            
            if (newApiKey !== apiKey || newModelName !== modelName) {
                apiKey = newApiKey;
                modelName = newModelName;
                genAI = new GoogleGenerativeAI(apiKey);
                model = genAI.getGenerativeModel({ model: modelName });
            }
        }

        if (event.affectsConfiguration('ai-latex-helper')) {
            const helperConfig = vscode.workspace.getConfiguration('ai-latex-helper');
            debounceDelay = helperConfig.get<number>('debounceDelay') || 1000;
            const newIsEnabled = helperConfig.get<boolean>('enabled') ?? true;
            if (newIsEnabled !== isEnabled) {
                isEnabled = newIsEnabled;
                updateStatusBarText();
            }
        }
    });

    const changeListener = vscode.workspace.onDidChangeTextDocument(onTextDocumentChange);

    context.subscriptions.push(
        setApiKeyCommand,
        convertCommand,
        toggleCommand,
        completionProvider,
        changeListener,
        configListener,
        latexStatusBarItem
    );
}

export function deactivate() { }