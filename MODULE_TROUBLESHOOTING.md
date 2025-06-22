# Module System Troubleshooting

## The Issue We Fixed

You were getting this error:
```
(node:71953) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///Users/mquanit/Desktop/Projects/costguard/backend/src/functions/CostData/index.js is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to /Users/mquanit/Desktop/Projects/costguard/backend/package.json.
─ ReferenceError: module is not defined in ES module scope
```

## Root Cause

The file had **mixed module syntax**:
- ES Module imports: `import { ... } from '...'`
- CommonJS exports: `module.exports = ...`

Node.js detected the `import` statements and tried to parse the file as an ES module, but then failed when it encountered `module.exports`.

## Solution Applied

✅ **Converted to pure CommonJS** (recommended for Lambda functions):
- Changed `import` statements to `require()`
- Kept `module.exports` for exports
- Set ESLint `sourceType: 'commonjs'` explicitly

## Why CommonJS for Lambda?

1. **AWS Lambda Runtime** - Better compatibility with Node.js Lambda runtime
2. **Serverless Framework** - Designed primarily for CommonJS
3. **Cold Start Performance** - CommonJS has slightly better cold start times
4. **Ecosystem Compatibility** - Most AWS SDK examples use CommonJS

## Module System Rules

### ✅ CommonJS (What we're using)
```javascript
// Imports
const { CostExplorerClient } = require('@aws-sdk/client-cost-explorer');
const fs = require('fs');

// Exports
module.exports.handler = async (event) => { ... };
exports.helper = function() { ... };
```

### ❌ ES Modules (Don't mix with CommonJS)
```javascript
// Imports
import { CostExplorerClient } from '@aws-sdk/client-cost-explorer';
import fs from 'fs';

// Exports
export const handler = async (event) => { ... };
export default handler;
```

## If You Want to Use ES Modules

If you prefer ES modules, you would need to:

1. Add `"type": "module"` to package.json
2. Convert ALL files to ES module syntax
3. Update serverless.yml handler paths
4. Update ESLint config to `sourceType: 'module'`
5. Test thoroughly with Serverless Framework

## Prevention

- **Stick to one module system** throughout the project
- **Use ESLint** - Our config now catches mixed syntax
- **Code reviews** - Watch for import/require mixing

## Quick Check

Test your module loading:
```bash
node -e "const handler = require('./src/functions/CostData/index.js'); console.log('✅ Module loads correctly');"
```

If you see this output without errors, you're good to go!
