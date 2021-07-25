# yarn-plugin-prune-prod

Remove `devDependencies` from `.pnp.cjs` and the `cache` folder in Yarn 3.

Intended to assist with building smaller, more stable docker images that are consistent between environments by leveraging Yarn's [Zero Install](https://yarnpkg.com/features/zero-installs) feature.

### Installation

```bash
yarn plugin import https://raw.githubusercontent.com/troncali/yarn-prune-prod/main/bundles/%40yarnpkg/plugin-prune-prod.js
```

### Command

```bash
yarn prune-prod
```

### How it works 

This plugin is a tweaked implementation of the `focus` command from`@yarnpkg/workspace-tools`, [which does not have an option to prune the cache](https://github.com/yarnpkg/berry/issues/1789#issuecomment-713031319). 

This plugin is equivalent to the command [`yarn workspaces focus --all --production`](https://yarnpkg.com/cli/workspaces/focus) (omits `devDependencies` but installs all other dependencies for all workspaces).

The context of how this plugin is used will dictate what happens:

- If the plugin is used with an existing `cache` of all project dependencies, the "install" will use cached files (without fetching each dependency) and update `.pnp.cjs` to omit `devDependencies`, then prune the cache of `devDependencies`.

- If the plugin is used without a `cache`, it will freshly fetch all dependencies other than `devDependencies`and populate `.pnp.cjs` to match.

- If the plugin is used where some dependencies exist in the `cache` and some do not, both of the above will apply accordingly.

The result is equivalent to `yarn install --production` in Yarn 1.

### Dockerfile example

A full example is [available here](https://github.com/troncali/nest-vue/blob/main/src/docker/backend.Dockerfile), with relevant parts pasted below.

```Dockerfile
# Reduce image bloat with a prebuild to gather production files and dependencies
FROM node:16.5-alpine AS prebuild
    WORKDIR /tmp
    COPY ./build ./build
    COPY [".pnp.cjs", ".yarnrc.yml", "package.json", "yarn.lock", "./"]
    COPY ./.yarn ./.yarn
    # ./.yarn/cache includes devDependencies, so use plugin to prune
    RUN yarn prune-prod

# Build the production image
FROM node:16.5-alpine AS production
	RUN mkdir -p /home/node/app/builds && chown -R node:node /home/node/app
	WORKDIR /home/node/app
	USER node
	# Leverage Yarn's Zero-Install feature for production files and dependencies
	COPY --chown=node:node --from=prebuild /tmp .
	EXPOSE ${BACKEND_PORT}
	# Require .pnp.cjs for Yarn PnP's dependency resolution
	CMD ["node", "-r", "./.pnp.cjs", "builds/backend/main.js"]
```

### Credits

This plugin implements the [PR proposed by yinzara](https://github.com/yarnpkg/berry/pull/1798#issuecomment-713030607).