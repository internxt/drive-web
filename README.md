[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=internxt_drive-web&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=internxt_drive-web)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=internxt_drive-web&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=internxt_drive-web)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=internxt_drive-web&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=internxt_drive-web)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=internxt_drive-web&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=internxt_drive-web)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=internxt_drive-web&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=internxt_drive-web)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=internxt_drive-web&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=internxt_drive-web)

# Project Manteinance

We aim to have:

- An 'A' score on Maintainability Rating
- An 'A' score on Security Rating
- A 3% of duplicated lines

# Getting Started

## Installation

- Create a `.npmrc` file from the `.npmrc.template` example provided in the repo.
- Replace `TOKEN` with your own [Github Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) with `read:packages` permission **ONLY**
- Use `yarn` to install project dependencies.

## Scripts

### `yarn start` / `yarn run dev`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `yarn run lint` (`yarn run lint:ts` && `yarn run lint:scss`)

- Runs .ts linter
- Runs .scss linter

### `yarn test` (`yarn test:unit` && `yarn test:e2e`)

- Runs unit tests with [Jest](https://jestjs.io/)
- Runs e2e tests with [Playwright](https://playwright.dev/)

### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Directory structure

- [.github](./.github)
- [.husky](./.husky)
- [public](./public)
- [scripts](./scripts)
- [src](./src)
  - [app](./src/app)
  - [assets](./src/assets)
  - [App.tsx](./src/App.tsx)
  - [index.scss](./src/index.scss)
  - [index.tsx](./src/index.tsx)
  - [react-app-env.d.ts](./src/react-app-env.d.ts)
  - [reportWebVitals.ts](./src/reportWebVitals.ts)
  - [setupTests.ts](./src/setupTests.ts)
- [test](./test)
- [.env.example](./.env.example)
- [.eslintrc.json](./eslintrc.json)
- [.gitignore](./.gitignore)
- [.npmrc.template](./.npmrc.template)
- [.pretierrc.json](./.pretierrc.json)
- [.stylelintignore](./.stylelintignore)
- [.stylelintrc.json](./.stylelintrc.json)
- [craco.config.js](./craco.config.js)
- [jest.config.js](./jest.config.js)
- [package.json](./package.json)
- [README.md](./README.md)
- [tailwind.config.js](./tailwind.config.js)
- [tsconfig.json](./tsconfig.json)
- [yarn.lock](./yarn.lock)

The [/src](./src) folder contains the source code. </br>
The subfolder [/src/app](./src/app) organizes the code in a very similar way to Angular, grouping by feature related files in modules.

</br>

## Config Tailwind CSS purge option

It is important to add in the tailwind.config.js file, within the purge property, the list of classes that we are overriding within a Tailwind layer (components, utilities or base) for third-party packages (such as react-bootstrap)

For example, with this snippet we are telling to purge that we are overriding the react-bootstrap Dropdown and Tabs classes:

```javascript
  purge: {
    content: ["./src/**/*.tsx"],
    options: {
      safelist: [
        'dropdown-menu', 'dropdown-item',
        'nav-item', 'nav-link', 'tab-content', 'tab-pane'
      ]
    }
  }
```

## Recommended IDE extensions (Visual Studio Code)

To speed up the development and maintenance of the project, it is recommended to use the following extensions for the IDE:

- Better Comments
- ESLint
- stylelint
- PostCSS Language Support
- SCSS Formatter
- Tailwind CSS IntelliSense

[![SonarCloud](https://sonarcloud.io/images/project_badges/sonarcloud-white.svg)](https://sonarcloud.io/summary/new_code?id=internxt_drive-web)
