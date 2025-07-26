# Setup

- Create `.env` from `.env.example`
- `pnpm install`
- `npx cypress install`
- `npm run test`

# Setup from scratch

- See https://cmu.to/fullstack68

# Issue

- TypeScript 5.0 introduced support for the `extends` property in `tsconfig.json` to accept an array of configuration files, allowing you to extend from multiple base configs in one file.
  - Prior to `TypeScript 5.0`, only a single string path was allowed for the `extends` property.
- It turns out that `ts-node` did not fully support the extends array syntax, depending on its version [[Ref]](https://github.com/tsconfig/bases/issues/167).
- Therefore, I can only extend one `tsconfig` file and I chose `@tsconfig/node-lts/tsconfig.json`.
