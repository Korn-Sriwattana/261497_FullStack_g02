# Preflight - Database

## Setup

- `pnpm install`
- Create `.env` from `.env.example`
- Create `.npmrc` from `.npmrc.example` (only for Windows user)
- For Windows, run `npm run eol` (take care of CRLF issue)
- `docker compose up -d`

## Usage

- `npm run db:push`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:prototype`

## Setup (from scratch)

- `npm init es6`
- `pnpm install dotenv drizzle-orm postgres`
- `pnpm install -D drizzle-kit typescript tsx @types/node @tsconfig/node-lts @tsconfig/node-ts cross-env`

`tsconfig.json`

```
{
  "extends": [
    "@tsconfig/node-lts/tsconfig.json",
    "@tsconfig/node-ts/tsconfig.json"
  ],
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": "./",
    "paths": {
      "@db/*": ["./db/*"]
    }
  }
}
```

`package.json`

```json
{
  "scripts": {
    "db:generate": "cross-env NODE_OPTIONS='--import tsx' drizzle-kit generate",
    "db:push": "cross-env NODE_OPTIONS='--import tsx' drizzle-kit push",
    "db:migrate": "cross-env NODE_OPTIONS='--import tsx' drizzle-kit migrate",
    "db:prototype": "tsx ./db/prototype.ts"
  }
}
```

## Note on drizzle-kit and ESM

The process of using `drizzle-kit` with modern JavaScript/TypeScript setups—specifically ES Modules (ESM) and native TypeScript—faces several technical hurdles. Here’s a breakdown of the main issues and the necessary workarounds:

**1. `drizzle-kit` Cannot Be Used with ESM Imports (Imports with `.js` Extension)**

- When using ESM syntax (i.e., `"type": "module"` in `package.json`), Node.js requires explicit file extensions in import statements, such as `import { usersTable } from './schema.js'`.
- However, `drizzle-kit` currently fails to resolve these ESM imports if the `.js` extension is present, leading to errors like `Cannot find module './first.js'` or failures during migration generation[^1][^2][^3].
- The tool expects CommonJS-style imports or omits the file extension, which is incompatible with strict ESM environments.

**2. Need to Set `NODE_OPTIONS="--import tsx"`**

- To run TypeScript or ESM files natively without pre-compiling to JavaScript, tools like [`tsx`](https://www.npmjs.com/package/tsx) are used as Node.js loaders.
- You must instruct Node to use the `tsx` loader by setting the environment variable:
  `NODE_OPTIONS="--import tsx"`
- This enables Node.js to interpret TypeScript and ESM files directly, but requires all Node invocations (including those by `drizzle-kit`) to include this loader[^4][^5][^6][^7].

**3. Making the Operation Cross-Platform with `cross-env`**

- Setting environment variables in npm scripts is platform-dependent:
  - On Unix: `NODE_OPTIONS=...`
  - On Windows: `set NODE_OPTIONS=...`
- The [`cross-env`](https://www.npmjs.com/package/cross-env) package solves this by providing a consistent syntax that works on all platforms:
  `cross-env NODE_OPTIONS="--import tsx" ...`
- This ensures that scripts work identically on Windows, macOS, and Linux, and is considered best practice for cross-platform Node.js development[^8][^9][^10].

**4. On Windows, Set `script-shell` to `pwsh.exe` in `.npmrc`**

- By default, npm scripts on Windows run in `cmd.exe`, which has limited support for Unix-like scripting and environment variable syntax.
- To use a more capable shell (like PowerShell Core), set the following in your project’s `.npmrc` file:
  `script-shell = pwsh.exe`
- This change allows npm scripts to run in PowerShell, improving compatibility with advanced scripting and cross-env usage[^11][^12][^13].

## Summary Table

| Issue/Workaround                                       | Why It’s Needed                                               | Reference        |
| :----------------------------------------------------- | :------------------------------------------------------------ | :--------------- |
| `drizzle-kit` fails with ESM imports (`.js` extension) | ESM requires explicit extensions; `drizzle-kit` can’t resolve | [^1][^2][^3]     |
| Set `NODE_OPTIONS="--import tsx"`                      | Enables TypeScript/ESM support in Node.js                     | [^4][^5][^6][^7] |
| Use `cross-env` for scripts                            | Makes env vars cross-platform in npm scripts                  | [^8][^9][^10]    |
| Set `script-shell = pwsh.exe` in `.npmrc` (Windows)    | Ensures npm scripts run in PowerShell, not cmd.exe            | [^11][^12][^13]  |

## Practical Example

A typical `package.json` script for cross-platform TypeScript/ESM support with `drizzle-kit` might look like:

```json
"scripts": {
  "migrate": "cross-env NODE_OPTIONS='--import tsx' drizzle-kit generate"
}
```

And in your `.npmrc` (for Windows support):

```
script-shell = pwsh.exe
```

## Conclusion

These issues stem from the intersection of evolving JavaScript module standards, TypeScript tooling, and the current limitations of `drizzle-kit`. Until `drizzle-kit` natively supports ESM and TypeScript loading, these workarounds—using `tsx`, `cross-env`, and configuring the shell—are necessary for reliable, cross-platform development[^4][^8][^11][^1][^9][^2][^3].

[^1]: https://github.com/drizzle-team/drizzle-orm/issues/3124
[^2]: https://www.answeroverflow.com/m/1281815157026324480
[^3]: https://github.com/drizzle-team/drizzle-orm/issues/1561
[^4]: https://www.npmjs.com/package/tsx/v/4.0.0
[^5]: https://gist.github.com/khalidx/1c670478427cc0691bda00a80208c8cc?permalink_comment_id=4769796
[^6]: https://dev.to/_staticvoid/how-to-run-typescript-natively-in-nodejs-with-tsx-3a0c
[^7]: https://tsx.is/node/
[^8]: https://javascript.plainenglish.io/the-cross-env-package-the-environment-variable-hero-4cbf7a852228
[^9]: https://www.npmjs.com/package/cross-env
[^10]: https://javascript.plainenglish.io/the-cross-env-package-the-environment-variable-hero-4cbf7a852228?gi=43082f608021
[^11]: https://stackoverflow.com/questions/23243353/how-to-set-shell-for-npm-run-scripts-in-windows
[^12]: https://stackoverflow.com/questions/23243353/how-to-set-shell-for-npm-run-scripts-in-windows/46006249
[^13]: https://blog.csdn.net/sflf36995800/article/details/125475662
[^14]: https://github.com/drizzle-team/drizzle-orm/issues/2853
[^15]: https://www.answeroverflow.com/m/1118710643630026802
[^16]: https://www.reddit.com/r/Nuxt/comments/1fpx4yx/how_to_setup_correctly_the_drizzle_with_nuxt/
[^17]: https://github.com/privatenumber/tsx/blob/master/docs/dev-api/node-cli.md
[^18]: https://dev.to/_staticvoid/accessing-env-files-natively-with-nodejs-44hf
[^19]: https://stackoverflow.com/questions/71581438/how-to-reference-environment-variables-from-env-file-with-cross-env
[^20]: https://github.com/kentcdodds/cross-env/issues/208
[^21]: https://blog.csdn.net/i042416/article/details/145901317
[^22]: https://www.1wayto.com/Fixed-npm-start-not-working-with-fnm-on-Windows-2083842962f080eeb416e983e1dd3825?pvs=21
[^23]: https://www.answeroverflow.com/m/1119716298721595463
[^24]: https://www.answeroverflow.com/m/1089811843251449856
[^25]: https://dev.to/antongolub/errrequireesm-4j0h
[^26]: https://newreleases.io/project/npm/drizzle-kit/release/0.19.0
[^27]: https://stackoverflow.com/questions/56742334/how-to-use-the-node-options-environment-variable-to-set-the-max-old-space-size-g
[^28]: https://github.com/webpack/webpack/issues/17553
[^29]: https://www.npmjs.com/package/tsx/v/3.8.2?activeTab=versions
[^30]: https://typestrong.org/ts-node/docs/recipes/other/
[^31]: https://stackoverflow.com/questions/69483812/how-does-cross-env-command-works-in-nodejs
[^32]: https://github.com/marcojakob/cross-env-file
[^33]: https://amazingalgorithms.com/snippets/npm-packages/cross-env/
[^34]: https://github.com/iki/cross-env-default
[^35]: https://aamnah.com/notes/reactnative/react-native-multiple-environment-setup-variables-cross-platform-envfile/
[^36]: https://github.com/npm/feedback/discussions/115
[^37]: https://github.com/npm/cli/issues/5332
[^38]: https://stackoverflow.com/questions/50998089/running-npm-script-on-windows-starting-with-a-period/52954967
[^39]: https://www.ctyun.cn/developer/article/496309334851653
[^40]: https://www.kali.org/tools/powershell/
