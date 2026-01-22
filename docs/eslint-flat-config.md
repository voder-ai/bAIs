# ESLint Flat Config - Critical Configuration Guidelines

## ⚠️ DANGER ZONE: Handle with Extreme Care

This project uses **ESLint v9+ Flat Config format**. This configuration system is extremely fragile and requires precise handling. A single mistake can break your entire linting setup.

## 🚨 CRITICAL RULES - NEVER VIOLATE THESE

### 1. File Name is SACRED

- **MUST** remain `eslint.config.js`
- **NEVER** rename to `.eslintrc.js` (old format - WILL NOT WORK)
- **NEVER** rename to `eslint.config.cjs` (CommonJS format - will break in ES module projects)
- **NEVER** rename to `.eslintrc.json`, `.eslintrc.yml`, or any other legacy format

### 2. Format is NON-NEGOTIABLE

- **MUST** use ES modules (`import`/`export default`) syntax
- **NEVER** use CommonJS (`require`/`module.exports`) unless project is pure CommonJS
- **NEVER** mix CommonJS and ES module syntax

### 3. Structure is FRAGILE

- The flat config array structure is **order-dependent**
- Global ignores **MUST** be first in the array
- File-specific configurations come after base configurations
- Rule overrides come last

## 💀 Common Ways to Break Everything

### Fatal Mistake #1: Renaming the File

```bash
# ❌ NEVER DO THIS - Will completely break linting
mv eslint.config.js .eslintrc.js

# ❌ NEVER DO THIS - Wrong extension for ES modules
mv eslint.config.js eslint.config.cjs
```

### Fatal Mistake #2: Wrong Module Format

```javascript
// ❌ NEVER DO THIS in ES module projects
const js = require('@eslint/js');
module.exports = [...];

// ✅ CORRECT - Use ES modules
import js from '@eslint/js';
export default [...];
```

### Fatal Mistake #3: Breaking the Array Structure

```javascript
// ❌ NEVER DO THIS - Wrong structure
export default {
  // This is legacy format, will fail
};

// ✅ CORRECT - Must be array
export default [
  // Flat config objects
];
```

## 🔧 Safe Configuration Guidelines

### Order Matters - Follow This Sequence:

1. **Global ignores** (separate object, must be first)
2. **Base configurations** (js.configs.recommended, etc.)
3. **File-specific configurations** (different rules for different file patterns)
4. **Environment-specific overrides** (test files, scripts, etc.)

### Example Safe Structure:

```javascript
export default [
  // 1. Global ignores FIRST
  {
    ignores: ['dist/', 'build/', 'node_modules/'],
  },

  // 2. Base configuration
  js.configs.recommended,

  // 3. File-specific rules
  {
    files: ['src/**/*.js'],
    rules: {
      // rules here
    },
  },

  // 4. Overrides last
  {
    files: ['**/*.test.js'],
    rules: {
      'no-console': 'off',
    },
  },
];
```

## 🚑 Emergency Recovery

If you break the config and ESLint stops working:

1. **Check the file name** - Must be exactly `eslint.config.js`
2. **Verify ES module syntax** - No `require`/`module.exports` statements
3. **Ensure array export** - `export default [...]`
4. **Validate syntax** - Run through a JavaScript validator
5. **Check dependencies** - Ensure all required packages are installed

## 📋 Testing Your Config

Always test after changes:

```bash
# Test the config loads without errors
npx eslint --print-config src/index.js

# Run linting to verify it works
npm run lint
```

## 🎯 Key Takeaways

- **ESLint Flat Config is powerful but unforgiving**
- **File naming is non-negotiable**
- **Module format must match project type**
- **Array structure and order are critical**
- **Test immediately after any changes**

## 📚 References

- [ESLint Flat Config Documentation](https://eslint.org/docs/latest/use/configure/configuration-files-new)
- [Migration Guide from Legacy Config](https://eslint.org/docs/latest/use/configure/migration-guide)

---

**Remember: One small mistake can break your entire development workflow. When in doubt, don't touch the config file.**
