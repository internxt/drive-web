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
- Less than 3% duplicated lines
- A 50% tests coverage

# Getting Started

## Installation

- Create a `.npmrc` file from the `.npmrc.template` example provided in the repo.
- Replace `TOKEN` with your own [Github Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) with `read:packages` permission **ONLY**
- Use `yarn` to install project dependencies.

## Scripts

### `yarn dev`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `yarn start`

Serves the built application locally to preview the production output.
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

- Useful for testing the result of a production build.
- No hot reloading or development tools included.

> Before running `yarn start`, make sure you have already built the application using:
> `yarn run build`
> The preview command serves the latest build output, so if you haven't run build beforehand, it will either fail or serve outdated files.

### `yarn run lint` (`yarn run lint:ts` && `yarn run lint:scss`)

- Runs .ts linter
- Runs .scss linter

### `yarn test`

- Runs unit tests with [Vitest](https://vitest.dev/)

### `test:playwright` (`yarn playwright test`)

- Runs end to end tests with [Playwright](https://playwright.dev/)

### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

## Directory structure (old)

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
- [package.json](./package.json)
- [README.md](./README.md)
- [tailwind.config.js](./tailwind.config.js)
- [tsconfig.json](./tsconfig.json)
- [yarn.lock](./yarn.lock)

The [/src](./src) folder contains the source code.

# New Project Structure

This project is organized following a **view-based hierarchy** approach. Each view (or page) has its own folder containing its specific components, styles, and logic. Additionally, reusable components, custom hooks, utilities, and global styles are stored in separate directories to enhance reusability and maintainability.

Example:

```
src/
├── views/
│   ├── Login/
│   │   ├── index.tsx              # Main login view
│   │   ├── Login.module.css
│   │   ├── components/            # Login-specific components
│   │   │   ├── LoginForm.tsx
│   │   │   └── SocialLogin.tsx
│   │   ├── hooks/                 # Custom hooks for login
│   │   │   └── useLogin.ts
│   │   ├── services/              # API calls for authentication
│   │   │   └── authService.ts
│   │   ├── store/                 # Redux slice for login state
│   │   │   └── loginSlice.ts
│   │   └── types/                 # TypeScript types/interfaces
│   │       └── login.types.ts
│   │
│   ├── Signup/
│   │   ├── index.tsx              # Main signup view
│   │   ├── components/            # Signup-specific components
│   │   │   ├── SignupForm.tsx
│   │   │   └── PlanSelector.tsx
│   │   ├── hooks/                 # Custom hooks for signup
│   │   │   └── useSignup.ts
│   │   ├── services/              # API calls for registration
│   │   │   └── registrationService.ts
│   │   ├── store/                 # Redux slice for signup state
│   │   │   └── signupSlice.ts
│   │   └── types/                 # TypeScript types/interfaces
│   │       └── signup.types.ts
│   │
│   ├── Home/                      # Main layout wrapper
│   │   ├── index.tsx              # Home layout component
│   │   ├── components/            # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── UserMenu.tsx
│   │   ├── store/                 # Redux slice for UI state
│   │   │   └── uiSlice.ts
│   │   ├── types/                 # TypeScript types/interfaces
│   │   │   └── ui.types.ts
│   │   └── Home.module.css
│   │
│   ├── Drive/                     # Main files view
│   │   ├── index.tsx              # Drive page component
│   │   ├── components/            # Drive-specific components
│   │   │   ├── FileList.tsx
│   │   │   ├── FileItem.tsx
│   │   │   ├── FolderItem.tsx
│   │   │   ├── UploadButton.tsx
│   │   │   └── FilePreview.tsx
│   │   ├── hooks/                 # Custom hooks for files
│   │   │   ├── useFiles.ts
│   │   │   ├── useUpload.ts
│   │   │   └── useFileActions.ts
│   │   ├── services/              # API calls for files
│   │   │   ├── fileService.ts
│   │   │   └── uploadService.ts
│   │   ├── store/                 # Redux slices for Drive
│   │   │   ├── filesSlice.ts      # Files state management
│   │   │   └── selectors.ts       # Reselect selectors
│   │   ├── types/                 # TypeScript types/interfaces
│   │   │   └── file.types.ts
│   │   └── utils/                 # Helper functions
│   │       └── fileHelpers.ts
│   │
│   ├── Recents/                   # Recent files view
│   │   ├── index.tsx              # Recents page component
│   │   ├── components/            # Recents-specific components
│   │   │   ├── RecentFilesList.tsx
│   │   │   └── TimelineView.tsx
│   │   ├── hooks/                 # Custom hooks for recent files
│   │   │   └── useRecentFiles.ts
│   │   ├── services/              # API calls for recents
│   │   │   └── recentsService.ts
│   │   ├── store/                 # Redux slice for recents
│   │   │   └── recentsSlice.ts
│   │   └── types/                 # TypeScript types/interfaces
│   │       └── recents.types.ts
│   │
│   ├── Backups/                   # Backups view
│   │   ├── index.tsx              # Backups page component
│   │   ├── components/            # Backup-specific components
│   │   │   ├── BackupList.tsx
│   │   │   ├── CreateBackup.tsx
│   │   │   └── RestoreDialog.tsx
│   │   ├── hooks/                 # Custom hooks for backups
│   │   │   └── useBackups.ts
│   │   ├── services/              # API calls for backups
│   │   │   └── backupService.ts
│   │   ├── store/                 # Redux slice for backups
│   │   │   └── backupsSlice.ts
│   │   └── types/                 # TypeScript types/interfaces
│   │       └── backup.types.ts
│   │
│   ├── Shared/                    # Shared files view
│   │   ├── index.tsx              # Shared page component
│   │   ├── components/            # Shared-specific components
│   │   │   ├── SharedFilesList.tsx
│   │   │   └── ShareDialog.tsx
│   │   ├── hooks/                 # Custom hooks for sharing
│   │   │   └── useSharedFiles.ts
│   │   ├── services/              # API calls for sharing
│   │   │   └── shareService.ts
│   │   ├── store/                 # Redux slice for shared files
│   │   │   └── sharedSlice.ts
│   │   └── types/                 # TypeScript types/interfaces
│   │       └── shared.types.ts
│   │
│   └── Trash/                     # Trash view
│       ├── index.tsx              # Trash page component
│       ├── components/            # Trash-specific components
│       │   ├── TrashList.tsx
│       │   └── RestoreButton.tsx
│       ├── hooks/                 # Custom hooks for trash
│       │   └── useTrash.ts
│       ├── services/              # API calls for trash
│       │   └── trashService.ts
│       ├── store/                 # Redux slice for trash
│       │   └── trashSlice.ts
│       └── types/                 # TypeScript types/interfaces
│           └── trash.types.ts
│
├── shared/                        # Shared code across views
│   ├── components/                # Reusable UI components
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   └── Button.types.ts
│   │   ├── Modal/
│   │   │   ├── Modal.tsx
│   │   │   └── Modal.types.ts
│   │   ├── Dropdown/
│   │   │   ├── Dropdown.tsx
│   │   │   └── Dropdown.types.ts
│   │   └── SearchBar/
│   │       ├── SearchBar.tsx
│   │       └── SearchBar.types.ts
│   ├── hooks/                     # Global custom hooks
│   │   ├── useAuth.ts
│   │   └── useTheme.ts
│   ├── store/                     # Global Redux slices
│   │   ├── authSlice.ts          # Global auth state
│   │   ├── userSlice.ts          # User profile state
│   │   └── notificationsSlice.ts # App notifications
│   ├── types/                     # Global TypeScript types
│   │   ├── user.types.ts
│   │   ├── auth.types.ts
│   │   └── api.types.ts
│   ├── utils/                     # Global utility functions
│   │   ├── formatDate.ts
│   │   └── formatFileSize.ts
│   └── constants/                 # App constants
│       └── routes.ts
│
├── store/                         # Redux store configuration
│   ├── index.ts                   # Store setup & root reducer
│   ├── rootReducer.ts             # Combine all reducers
│   ├── store.types.ts             # Store type definitions
│   └── middleware.ts              # Custom middleware
│
├── config/                        # App configuration
│   └── api.ts                     # API base configuration
│
├── routes/                        # Route definitions
│   ├── AppRoutes.tsx              # React Router setup
│   └── routes.types.ts            # Route types
│
└── App.tsx                        # Root application component
```

## **Folder Descriptions**

Following the example structure above, each view folder contains the following subdirectories:

---

### **`views/[ViewName]/components/`**

View-specific UI components that are only used within that particular view. These components are tightly coupled to the view's functionality and are not meant to be reused across other views.

**Example:** `views/Login/components/LoginForm.tsx`, `views/Drive/components/FileList.tsx`

---

### **`views/[ViewName]/hooks/`**

Custom React hooks that encapsulate view-specific logic and state management. These hooks are designed to be used only within their corresponding view.

**Example:** `views/Login/hooks/useLogin.ts`, `views/Drive/hooks/useFileActions.ts`

---

### **`views/[ViewName]/services/`**

API calls and business logic specific to the view. This folder provides an abstraction layer for external interactions (API endpoints, data fetching) related to the feature.

**Example:** `views/Login/services/authService.ts`, `views/Drive/services/fileService.ts`

---

### **`views/[ViewName]/store/`**

Redux slices and state management specific to the view. Each view can manage its own state using Redux Toolkit slices, keeping state logic close to where it's used.

**Example:** `views/Login/store/loginSlice.ts`, `views/Drive/store/filesSlice.ts`

---

### **`views/[ViewName]/types/`**

TypeScript type definitions and interfaces specific to the view. This includes props interfaces, data models, and any type that is only relevant to this feature.

**Example:** `views/Login/types/login.types.ts`, `views/Drive/types/file.types.ts`

---

### **`views/[ViewName]/utils/`**

Helper functions and utilities specific to the view. These are not React hooks but pure functions that help with data transformation, validation, or other view-specific operations.

**Example:** `views/Drive/utils/fileHelpers.ts`

---

### **`shared/`**

Contains global, reusable code that is shared across multiple views:

- **`shared/components/`**: Atomic UI components (Button, Modal, Dropdown) used throughout the app
- **`shared/hooks/`**: Global custom hooks (useAuth, useTheme) shared across views
- **`shared/store/`**: Global Redux slices (authSlice, userSlice, notificationsSlice)
- **`shared/types/`**: Global TypeScript types (user.types.ts, api.types.ts)
- **`shared/utils/`**: Global utility functions (formatDate, formatFileSize)
- **`shared/constants/`**: App-wide constants (routes, API endpoints)

---

### **`store/`**

Redux store configuration and setup:

- **`store/index.ts`**: Store setup and root reducer
- **`store/rootReducer.ts`**: Combines all reducers (from views and shared)
- **`store/middleware.ts`**: Custom Redux middleware
- **`store/store.types.ts`**: Store type definitions

---

### **`config/`**

Application-wide configuration files (API base URLs, environment settings, feature flags).

---

### **`routes/`**

React Router configuration and route definitions for the entire application.

---

This **view-based structure** ensures:

- **Modularity**: Each view is self-contained with its own components, logic, and state
- **Scalability**: Adding new features doesn't affect existing ones
- **Maintainability**: Related code is co-located, making it easy to find and modify
- **Reusability**: Shared code is clearly separated in the `shared/` directory
- **Type Safety**: TypeScript types are organized alongside the code that uses them

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
