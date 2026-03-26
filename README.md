[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=internxt_drive-web&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=internxt_drive-web)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=internxt_drive-web&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=internxt_drive-web)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=internxt_drive-web&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=internxt_drive-web)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=internxt_drive-web&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=internxt_drive-web)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=internxt_drive-web&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=internxt_drive-web)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=internxt_drive-web&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=internxt_drive-web)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=internxt_drive-web&metric=coverage)](https://sonarcloud.io/summary/new_code?id=internxt_drive-web)

# Project Maintenance

We aim to have:

- An 'A' score on Maintainability Rating
- An 'A' score on Security Rating
- Less than 2% duplicated lines
- A 75% tests coverage

# Getting Started

## Installation

- Create a `.npmrc` file from the `.npmrc.template` example provided in the repo.
- Replace `TOKEN` with your own [Github Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) with `read:packages` permission **ONLY**
- Use `yarn` to install project dependencies.

## Scripts

### `yarn run dev`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `yarn run preview`

Serves the built application locally to preview the production output.
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

- Useful for testing the result of a production build.
- No hot reloading or development tools included.

> Before running `yarn run preview`, make sure you have already built the application using:
> `yarn run build`
> The preview command serves the latest build output, so if you haven't run build beforehand, it will either fail or serve outdated files.

### `yarn run lint` (`yarn run lint:ts` && `yarn run lint:scss`)

- Runs .ts linter
- Runs .scss linter

### `yarn test` (`yarn test:unit`)

- Runs unit tests with [Vitest](https://vitest.dev/)

### `test:playwright` (`yarn playwright test`)

- Runs end to end tests with [Playwright](https://playwright.dev/)

### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

# Project Structure

This project is organized following a **visual and functional hierarchy** approach. Each view (or page) has its own folder containing its specific components, styles, and logic. Additionally, reusable components, custom hooks, utilities, and global styles are stored in separate directories to enhance reusability and maintainability.

Example:

```
src/
├── components/           # Common reusable components across the application
│   ├── Button.tsx
│   ├── Modal.tsx
│   ├── Loader.tsx
│   └── index.ts
├── views/                # Main application views
│   ├── Login/            # Login view and its internal components
│   │   ├── LoginForm.tsx
│   │   ├── SocialLoginButtons.tsx
│   │   ├── styles.css
│   │   └── Login.tsx
│   └── hooks/            # Custom Login React hooks
│       └── useAuth.ts
│   ├── Signup/           # Signup view and its internal components
│   │   ├── SignupForm.tsx
│   │   ├── TermsCheckbox.tsx
│   │   ├── styles.css
│   │   └── Signup.tsx
│   ├── Home/             # Home view with its main components
│   │   ├── Topbar.tsx    # Top navigation bar
│   │   ├── Sidenav.tsx   # Side navigation menu
│   │   ├── Dashboard.tsx # Main panel of the Home view
│   │   ├── Settings/     # Settings (subfolder within Home)
│   │   │   ├── SettingsModal.tsx       # Main settings page
│   │   │   ├── LanguageOptions.tsx
│   │   │   ├── ThemeSwitcher.tsx
│   │   │   └── styles.css
│   │   ├── styles.css    # General styles for Home
│   │   └── Home.tsx      # Main component for the Home view
├── hooks/                # Custom React hooks
│   ├── useTheme.ts
│   └── useFetch.ts
├── services/             # Logic for interacting with external APIs or services
│   ├── authService.ts
│   └── userService.ts
├── utils/                # Utility functions and helpers
│   ├── formatDate.ts     # Date formatting functions
│   └── validateForm.ts   # Form validation helpers
├── styles/               # Global styles
│   ├── variables.scss
│   └── global.css
├── types/                # Global and component-specific types
│   └── global.d.ts       # Global types (e.g., user, environment)
├── App.tsx               # Main application entry point
└── index.ts
```

## **Folder Descriptions**

### **`components/`**

This folder contains common and reusable components that are used across different views, such as buttons, modals, or loaders. These are atomic components and are not tied to any specific view.

---

### **`views/`**

Each main application view has its own folder (e.g., `Login`, `Signup`, `Home`). Inside each folder:

- Specific components related to the view are included at the same level.
- Local styles are kept in a dedicated CSS file.
- If a view contains complex subsections (e.g., `Settings` within `Home`), they are organized in subfolders.

---

### **`hooks/`**

Custom React hooks that encapsulate reusable logic.

---

### **`services/`**

This folder contains logic for interacting with external APIs or services. It provides an abstraction layer for API calls or other external integrations.

---

### **`utils/`**

Utility functions, global constants, and helpers that are not tied to React. These utilities can be used across the entire application.

---

### **`styles/`**

Global styles and variables for consistent theming across the application.

---

### **`types/`**

This folder contains shared TypeScript types used throughout the project

This structure ensures **modularity**, **scalability**, and **maintainability** while making the codebase easy to navigate and extend. 🚀

## Config Tailwind CSS purge option

It is important to add in the `tailwind.config.ts` file, within the `safelist` property, the list of classes that we are overriding within a Tailwind layer (components, utilities or base) for third-party packages (such as react-bootstrap).

For example, with this snippet we are telling Tailwind to keep the react-bootstrap Dropdown and Tabs classes:

```typescript
  safelist: [
    'dropdown-menu', 'dropdown-item',
    'nav-item', 'nav-link', 'tab-content', 'tab-pane'
  ]
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
