import * as vscode from 'vscode';
import { MemorySizeHoverProvider } from './hoverProvider';
import { TypeInfoProvider } from './typeInfo';

export function activate(context: vscode.ExtensionContext) {
    const provider = new MemorySizeHoverProvider();
    const typeProvider = TypeInfoProvider.getInstance();


    // Register ONLY ONE hover provider for all C/C++ files
    const disposable = vscode.languages.registerHoverProvider(
        [
            { scheme: 'file', language: 'c' },
            { scheme: 'file', language: 'cpp' },
            { scheme: 'file', language: 'h' },
            { scheme: 'file', language: 'hpp' }
        ],
        provider
    );
    
    const configDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
        if (
            event.affectsConfiguration('memorySizeHover.architecture') ||
            event.affectsConfiguration('C_Cpp.default.intelliSenseMode')
        ) {
            typeProvider.refreshArchitecture();
            provider.clearCache();
        }

        if (event.affectsConfiguration('memorySizeHover.showArchitecture')) {
            provider.clearCache();
        }
    });

    context.subscriptions.push(disposable, configDisposable);
}

export function deactivate() {}
