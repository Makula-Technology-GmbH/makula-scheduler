# Contributing Guide for react-big-schedule

Welcome to the react-big-schedule project! We're thrilled that you're interested in contributing to our open-source scheduling component for React. By contributing to this project, you can help make it even better and support the broader developer community.

### Code of Conduct

Before you start contributing, please take a moment to read our Code of Conduct. We expect all contributors to adhere to these guidelines to ensure a positive and inclusive community for everyone. You can find our Code of Conduct [here](https://github.com/ansulagrawal/react-big-schedule/blob/master/CODE_OF_CONDUCT.md).

### Getting Started

If you're new to the project, it's a good idea to familiarize yourself with the [README.md](https://github.com/ansulagrawal/react-big-schedule/blob/master/README.md) file, which provides an overview of the project and its features. Also, explore existing issues and pull requests to understand the ongoing work and discussions.

## 🚀 Release Process & Versioning

Releases are driven by the **version in `package.json`**. Whenever that version
changes on `master`, the [`Publish to npm`](.github/workflows/npm-publish.yml)
workflow builds the library and publishes it.

### Branch Strategy

- **`master` branch**: the release branch. All PRs should target it.
- A version bump landing on `master` triggers the publish.

### Cutting a Release

Maintainers release by bumping the version and pushing:

```bash
npm version patch   # 2.3.10 -> 2.3.11  (bug fixes)
npm version minor   # 2.3.10 -> 2.4.0   (new features)
npm version major   # 2.3.10 -> 3.0.0   (breaking changes)

git push origin master
```

Editing the `version` field in `package.json` by hand works exactly the same
way — the workflow only cares that the version changed.

### What Happens on a Version Bump

1. ✅ Checks npm for the version — if it is already published, the run stops
2. ✅ Installs dependencies with `npm ci`
3. ✅ Builds the library (`npm run build:lib`)
4. ✅ Verifies the package entry point exists and prints the tarball contents
5. ✅ Publishes to npm with a provenance attestation
6. ✅ Creates and pushes the `v<version>` Git tag
7. ✅ Creates a GitHub Release with generated changelog

Because npm is the source of truth, pushes that touch `package.json` without
changing the version, re-runs, and reverts are all no-ops — there is no risk of
a double publish.

### Pre-releases

Versions with a pre-release identifier are published under a matching npm
dist-tag instead of `latest`, and do not get a GitHub Release:

```bash
npm version 2.4.0-beta.1   # published as `beta`
npm version 2.4.0-rc.1     # published as `rc`
```

Install them explicitly with `npm install makula-schedule@beta`. Graduate a
pre-release by bumping to the plain version (`2.4.0`), which then becomes
`latest`.

### Repository Setup

The workflow needs one secret: **`NPM_TOKEN`**, an npm automation token with
publish rights for the package, set under *Settings → Secrets and variables →
Actions*. Provenance attestation is on by default; set the `NPM_PROVENANCE`
repository variable to `false` to disable it.

### How to Contribute

We value contributions in various forms – from reporting issues and suggesting improvements to submitting feature requests and providing code changes. To get started with your contributions, follow these steps:

1. #### Fork the Repository

   Begin by forking the main repository to your GitHub account. This will create a personal copy of the project that you can work on.

2. #### Set up the Development Environment

   Clone the forked repository to your local machine and set up the development environment using the instructions provided in the [README.md](https://github.com/ansulagrawal/react-big-schedule/blob/master/README.md) file.

3. #### Create a Branch

   Create a new branch for your specific contribution. Please use a descriptive and meaningful name for your branch, such as `fix/issue-123` or `feature/new-feature`.

4. #### Make Changes

   Now comes the coding part! Make the necessary changes to the codebase following the coding guidelines outlined below:

   #####
