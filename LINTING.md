# Code Linting Setup

This project uses ESLint for JavaScript code linting to maintain code quality and consistency.

## Available Scripts

- `pnpm run lint` - Run ESLint to check for issues
- `pnpm run lint:fix` - Run ESLint and automatically fix fixable issues
- `pnpm run lint:check` - Run ESLint with zero warnings tolerance (good for CI)
- `pnpm run precommit` - Run linting and tests (recommended before commits)

## Editor Integration

### VS Code Setup

The project includes comprehensive VS Code configuration:

#### Required Extension
- **ESLint** (`dbaeumer.vscode-eslint`) - Shows lint issues inline and provides auto-fixing

#### Features Enabled
- **Real-time linting** - Issues appear as you type
- **Inline error display** - Red squiggly lines under problematic code
- **Auto-fix on save** - Automatically fixes issues when you save
- **Problems panel** - View all issues in the Problems tab (Ctrl+Shift+M)
- **Quick fixes** - Use Ctrl+. to see available fixes

#### VS Code Tasks
Access via Command Palette (Ctrl+Shift+P):
- `Tasks: Run Task` → `ESLint: Check All Files`
- `Tasks: Run Task` → `ESLint: Fix All Auto-fixable Issues`
- `Tasks: Run Task` → `Run Tests`

### Other Editors

#### WebStorm/IntelliJ
1. Go to Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
2. Enable "Automatic ESLint configuration"
3. Check "Run eslint --fix on save"

#### Vim/Neovim
Install plugins like:
- `dense-analysis/ale` - Asynchronous linting
- `neoclide/coc-eslint` - ESLint integration for coc.nvim

#### Sublime Text
Install packages:
- `SublimeLinter`
- `SublimeLinter-eslint`

## ESLint Configuration

The project uses a modern flat config format (`eslint.config.js`) with the following rules:

### General Rules
- **No console warnings** - `console.log` is allowed for Lambda logging
- **Prefer const** - Use `const` for variables that aren't reassigned
- **Single quotes** - Use single quotes for strings
- **2-space indentation** - Consistent indentation
- **Semicolons required** - Always use semicolons
- **No trailing spaces** - Clean up whitespace

### Node.js Specific
- **CommonJS modules** - Uses `require()` and `module.exports`
- **Lambda-friendly** - Allows Lambda-specific patterns

### Jest Testing
- **Test file support** - Special rules for `*.test.js` and `*.spec.js` files
- **Jest globals** - Recognizes Jest functions like `describe`, `it`, `expect`

## How to See Lint Issues

### In VS Code
1. **Inline errors** - Red squiggly lines appear under problematic code
2. **Problems panel** - Press `Ctrl+Shift+M` to see all issues
3. **Status bar** - Shows error/warning count at bottom
4. **Hover tooltips** - Hover over red lines to see error details

### In Terminal
```bash
# See all issues with detailed output
pnpm run lint

# See issues in a specific file
npx eslint src/functions/CostData/index.js
```

### Common Issue Types You'll See
- 🔴 **Syntax errors** - Missing semicolons, brackets
- 🟡 **Style issues** - Wrong quotes, spacing, indentation
- 🟠 **Code quality** - Unused variables, prefer const
- 🔵 **Best practices** - Use === instead of ==

## Pre-commit Checks

Run `pnpm run precommit` before committing to ensure:
- No linting errors
- All tests pass
- Code follows project standards

## Ignoring Files

The following files/directories are ignored by ESLint:
- `node_modules/`
- `.serverless/`
- `coverage/`
- `dist/` and `build/`
- `*.min.js`

## Troubleshooting

### ESLint not working in VS Code?
1. Ensure ESLint extension is installed and enabled
2. Reload VS Code window (Ctrl+Shift+P → "Developer: Reload Window")
3. Check VS Code output panel for ESLint errors

### Issues not showing inline?
1. Check that `eslint.run` is set to `"onType"` in settings
2. Verify the file is a `.js` file
3. Make sure the file isn't in an ignored directory
