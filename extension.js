// THIS FILE IS NOT CURRENTLY IN USE
// IT IS A WORK IN PROGRESS AND MAY NEVER BE COMPLETED

// package.json:
// "activationEvents": ["*"],
// "main": "extension.js",

const vscode = require("vscode");
const snippets = require("./snippets.json");

// Compiles set of snippets into completion items
const buildCompletionItems = (snippets, insert, kind) => {
    const items = [];

    for (const snippet of snippets) {
        const str = typeof snippet === "string";
        const item = new vscode.CompletionItem(str ? snippet : snippet.token);
        item.insertText = new vscode.SnippetString((str ? insert : snippet.body)
                                                    .replace(/(?<!\$)\$S/, item.label) // $S -> snippet
                                                    .replace(/(?<!\$)\$R(\d+?)\-(\d+?)/, (_, s, e) => Array.from({length: +e - +s + 1}, (_, i) => +s + i).join()) // $R#-# -> comma-delim range
                                                    .replace("$$", "$")); // $$ -> $
        item.kind = kind;

        items.push(item);
    }

    return items;
}

// Include namespaces in builtin snippets
const completions = buildCompletionItems(Object.keys(snippets.namespaces), "$S", vscode.CompletionItemKind.Class);

// Fill in builtin snippets
for (const set of Object.values(snippets.builtin)) {
    completions.push(...buildCompletionItems(set.labels, set.body || "$S", vscode.CompletionItemKind[set.kind || "Function"]));
}

// Special snippets (@/#)
const specials = [];

for (const set of Object.values(snippets.special)) {
    specials.push(...buildCompletionItems(set.labels, set.body || "$S", vscode.CompletionItemKind[set.kind || "Function"]));
}

const namespaces = {};

// Create namespace snippets
for (const namespace in snippets.namespaces) {
    namespaces[namespace] = buildCompletionItems(snippets.namespaces[namespace], "$S($1)$0", vscode.CompletionItemKind.Function);
}

module.exports.activate = (context) => {
	const keywordProvider = vscode.languages.registerCompletionItemProvider("hla", {
		provideCompletionItems: () => completions,
	});

    // ???
    // @ and # make life difficult
    const specialProvider = vscode.languages.registerCompletionItemProvider("hla", {
        provideCompletionItems: (document, position) => {
            const token = document.lineAt(position).text.substr(0, position.character);
            console.log(token);
            return specials;
        },
    }, ["@", "#"]);

	const namespaceProvider = vscode.languages.registerCompletionItemProvider("hla", {
        provideCompletionItems(document, position) {
            const linePrefix = document.lineAt(position).text.substr(0, position.character);
            for (const namespace in namespaces) {
                if (linePrefix.endsWith(namespace + ".")) {
                    return namespaces[namespace];
                }
            }

            return undefined;
        }
    }, ".");

	context.subscriptions.push(keywordProvider, specialProvider, namespaceProvider);
}
