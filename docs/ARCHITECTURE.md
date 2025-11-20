# Project Architecture

This document describes the architectural decisions, project structure, and organizational principles for Internxt Drive Web.

## Table of Contents

- [Overview](#overview)
- [Architecture Principles](#architecture-principles)
- [Project Structure](#project-structure)
- [View-Based Architecture](#view-based-architecture)
- [Shared Code Organization](#shared-code-organization)
- [State Management](#state-management)
- [Routing](#routing)
- [File Organization Rules](#file-organization-rules)
- [Examples](#examples)

---

## Overview

Internxt Drive Web follows a **view-based hierarchy** architecture. Each view (or page) is self-contained with its own components, logic, state, and styles. This approach ensures modularity, scalability, and maintainability.

### Key Benefits

- **Modularity**: Each view is independent and self-contained
- **Scalability**: Adding new features doesn't affect existing code
- **Maintainability**: Related code is co-located, easy to find and modify
- **Reusability**: Shared code is clearly separated in dedicated directories
- **Type Safety**: TypeScript types are organized alongside the code that uses them

---

## Architecture Principles

### 1. **Separation of Concerns**

Code is organized by feature (view) rather than by type:

```
✅ Good: views/Drive/components/FileList.tsx
❌ Bad: components/drive/FileList.tsx
```

### 2. **Co-location**

Related code lives together:

```
views/Drive/
├── components/     # UI components for Drive
├── hooks/          # Custom hooks for Drive
├── services/       # API calls for Drive
├── store/          # State management for Drive
└── types.ts        # Types for Drive
```

### 3. **Single Responsibility**

Each directory has a clear, single purpose:

- **`views/`**: View-specific code
- **`common/`**: Cross-feature reusable code
- **`store/`**: Redux configuration
- **`routes/`**: Routing configuration
- **`config/`**: App-wide configuration

### 4. **Explicit Dependencies**

Import paths should be clear and explicit:

```tsx
// ✅ Good: Clear what's being imported and from where
import { FileList } from 'views/Drive/components/FileList';
import { ShareDialog } from 'common/components/ShareDialog';

// ❌ Bad: Unclear source
import { FileList } from '../../../components';
```

---

## Project Structure

```
src/
├── views/                         # Main application views
│   ├── Drive/                     # Main files view
│   ├── Shared/                    # Shared links view
│   ├── Recents/                   # Recent files view
│   ├── Backups/                   # Backups view
│   └── Trash/                     # Trash view
│
├── common/                        # Common code across views
│   ├── components/                # Reusable UI components
│   ├── hooks/                     # Global custom hooks
│   ├── store/                     # Global Redux slices
│   ├── types.ts                   # Global TypeScript types
│   ├── utils/                     # Global utility functions
│   └── constants/                 # App-wide constants
│
├── store/                         # Redux store configuration
│   ├── index.ts                   # Store setup & root reducer
│   ├── rootReducer.ts             # Combine all reducers
│   ├── store.ts                   # Store type definitions
│   └── middleware.ts              # Custom middleware
│
├── config/                        # App configuration
│   └── api.ts                     # API base configuration
│
├── routes/                        # Route definitions
│   ├── AppRoutes.tsx              # React Router setup
│   └── routes.ts                  # Route types
│
└── App.tsx                        # Root application component
```

---

## View-Based Architecture

Each view represents a major section of the application (a page or feature).

### View Structure

```
views/[ViewName]/
├── index.tsx                      # Main view component (entry point)
├── components/                    # View-specific UI components
│   ├── ComplexComponent/          # Folder for complex components
│   │   ├── ComplexComponent.tsx
│   │   ├── ComplexComponent.test.tsx
│   │   ├── ComplexComponent.scss
│   │   └── index.ts
│   └── SimpleComponent.tsx        # File for simple components
├── hooks/                         # View-specific custom hooks
│   └── useViewLogic.ts
├── services/                      # View-specific API calls
│   └── view.service.ts
├── store/                         # View-specific Redux slices
│   ├── index.ts
│   └── selectors.ts
├── types.ts or types/             # View-specific TypeScript types
│   ├── index.ts                   # (if using folder)
│   └── entity.types.ts
└── utils/                         # View-specific helper functions
    └── helpers.ts
```

### When to Create a New View

Create a new view when:

- It represents a distinct page/route in the application
- It has its own unique URL path
- It has significant functionality that deserves isolation
- It will have multiple components and logic specific to it

**Examples:**

- ✅ `views/Drive/` - Main file explorer page
- ✅ `views/Shared/` - Shared links management page
- ✅ `views/Recents/` - Recent files page
- ❌ Don't create `views/FilePreview/` - This is a component, not a page

---

## Common Code Organization

### `common/components/`

Reusable UI components used across multiple views.

**Categories:**

1. **Atomic Components**: Basic UI elements

   - `Button`, `Input`, `Checkbox`, `Dropdown`

2. **Composite Components**: More complex UI elements

   - `Modal`, `Dialog`, `Tooltip`

3. **Cross-View Components**: Feature-specific but used in multiple views
   - `ShareDialog` (used in Drive & Shared views)
   - `DeleteItemsDialog` (used in Drive, Shared, Trash views)

**When to use `common/components/`:**

- Component is used in **2 or more views**
- Component is generic enough to be reusable
- Component represents a common UI pattern

**When NOT to use `common/components/`:**

- Component is specific to one view → Use `views/[ViewName]/components/`
- Component is tightly coupled to view logic → Keep in view

### `common/hooks/`

Custom React hooks used across multiple views.

**Examples:**

```tsx
// common/hooks/useTheme.ts
export const useTheme = () => {
  // Global theme management
};
```

### `common/store/`

Global Redux slices that manage app-wide state.

**Examples:**

- `common/store/session/` - Authentication state
- `common/store/user/` - User profile data
- `common/store/ui/` - Global UI state (modals, notifications)

**When to use `common/store/`:**

- State is needed across multiple views
- State represents global app concerns (auth, user, settings)

**When NOT to use `common/store/`:**

- State is specific to one view → Use `views/[ViewName]/store/`

### `common/utils/`

Pure utility functions used across the application.

**Examples:**

```tsx
// common/utils/formatDate.ts
export const formatDate = (date: Date): string => { ... };

// common/utils/formatFileSize.ts
export const formatFileSize = (bytes: number): string => { ... };
```

### `common/types.ts`

Global TypeScript types and interfaces.

**Examples:**

```tsx
// common/types.ts
export interface User {
  id: string;
  email: string;
  name: string;
}

export type ApiResponse<T> = {
  data: T;
  error?: string;
};
```

### `common/constants/`

App-wide constants.

**Examples:**

```tsx
// common/constants/routes.ts
export const ROUTES = {
  DRIVE: '/drive',
  SHARED: '/shared',
  RECENTS: '/recents',
};

// common/constants/api.ts
export const API_ENDPOINTS = {
  FILES: '/api/files',
  FOLDERS: '/api/folders',
};
```

---

## State Management

### Redux Structure

```
store/
├── index.ts              # Store configuration and setup
├── rootReducer.ts        # Combines all reducers
└── middleware.ts         # Custom middleware

common/store/             # Global slices
├── session/
│   ├── index.ts         # Session slice
│   └── session.selectors.ts
└── user/
    └── index.ts         # User slice

views/Drive/store/        # View-specific slices
├── index.ts             # Files slice
└── storage.selectors.ts
```

### State Organization Guidelines

**Global State** (`common/store/`):

- Authentication (session, tokens)
- User profile (name, email, settings)
- UI state (modals, notifications, theme)

**View-Specific State** (`views/[ViewName]/store/`):

- Data specific to the view
- UI state specific to the view
- Temporary state that doesn't need to persist

**Local Component State** (`useState`):

- Form inputs
- Toggle states (open/closed, expanded/collapsed)
- Ephemeral UI state

---

## Routing

The application uses a **configuration-based routing system** where routes are defined in JSON and dynamically mapped to views and layouts.

### Route Structure

```
src/routes/
├── routes.tsx       # Dynamic route generator
├── paths.json       # Route configuration (paths, layouts, auth)
└── hooks/           # Routing-related hooks
```

### Route Configuration

Routes are defined in `src/routes/paths.json` with metadata:

```json
{
  "views": [
    {
      "id": "drive",
      "layout": "header-and-sidenav",
      "path": "/",
      "exact": true,
      "auth": true
    },
    {
      "id": "recents",
      "layout": "header-and-sidenav",
      "path": "/recents",
      "exact": true,
      "auth": true,
      "hideSearch": true
    },
    {
      "id": "trash",
      "layout": "header-and-sidenav",
      "path": "/trash",
      "exact": true,
      "auth": true,
      "hideSearch": true
    }
  ]
}
```

**Route Properties:**
- `id`: Unique identifier (mapped to AppView enum)
- `layout`: Layout wrapper to use (`empty`, `header-and-sidenav`, `share`)
- `path`: URL path pattern
- `exact`: Exact path matching
- `auth`: Requires authentication
- `hideSearch`: Hide search bar (optional)

### View Registration

Views are registered in `src/config/views.ts`:

```tsx
// src/config/views.ts
import { AppView } from '../types';
import DriveView from '../views/Drive';
import RecentsView from '../views/Recents';
import TrashView from '../views/Trash';

const views = [
  { id: AppView.Drive, component: DriveView },
  { id: AppView.Recents, component: RecentsView },
  { id: AppView.Trash, component: TrashView },
  // ...
];

export default views;
```

### Navigation Service

Navigation is handled through a centralized `navigationService` instead of React Router's `useNavigate`. This provides type-safe navigation using the `AppView` enum.

**Example:**

```tsx
import navigationService from 'src/services/navigation.service';
import { AppView } from 'src/types';

// Navigate to a view
navigationService.push(AppView.Drive);

// Navigate with query parameters
navigationService.push(AppView.Recents, { filter: 'images' });

// Navigate to folder or file
navigationService.pushFolder('folder-uuid');
navigationService.pushFile('file-uuid');
```

For complete API reference, see the navigationService source code.

---

## File Organization Rules

### Components

**Complex Component** (has tests, styles, sub-components, or helpers):

```
FileList/
├── FileList.tsx
├── FileList.test.tsx
├── FileList.scss
├── components/           # Sub-components
│   └── FileListItem.tsx
├── helpers.ts            # Helper functions
└── index.ts              # Barrel export
```

**Simple Component** (just the component):

```
FileItem.tsx              # Single file
```

### Types

**Small Module** (< 100 lines of types):

```
views/Login/
└── types.ts              # All types in one file
```

**Large Module** (> 100 lines or multiple contexts):

```
views/Drive/
└── types/
    ├── index.ts          # Barrel export
    ├── file.types.ts
    ├── folder.types.ts
    └── upload.types.ts
```

### Services

**API Services** follow a consistent pattern:

```tsx
// views/Drive/services/file.service.ts
class FileService {
  async getFiles(folderId: string): Promise<File[]> { ... }
  async uploadFile(file: File): Promise<void> { ... }
  async deleteFile(fileId: string): Promise<void> { ... }
}

export default new FileService();
```

---

## Examples

### Example 1: Adding a New View

**Scenario**: Add a "Photos" view to display images.

```
1. Create view structure:
   views/Photos/
   ├── index.tsx
   ├── components/
   │   ├── PhotoGrid/
   │   │   ├── PhotoGrid.tsx
   │   │   └── PhotoGrid.scss
   │   └── PhotoItem.tsx
   ├── hooks/
   │   └── usePhotos.ts
   ├── services/
   │   └── photo.service.ts
   ├── store/
   │   └── index.ts
   └── types.ts

2. Add route:
   routes/routes.ts: export const PHOTOS = '/photos';

3. Register in router:
   routes/AppRoutes.tsx: <Route path={ROUTES.PHOTOS} element={<Photos />} />
```

### Example 2: Creating a Shared Component

**Scenario**: Create a `ConfirmDialog` used in multiple views.

```
1. Check if it's truly shared (used in 2+ views): ✅ Yes

2. Create in common/components/:
   common/components/ConfirmDialog/
   ├── ConfirmDialog.tsx
   ├── ConfirmDialog.test.tsx
   ├── ConfirmDialog.scss
   └── index.ts

3. Use in views:
   import { ConfirmDialog } from 'common/components/ConfirmDialog';
```

### Example 3: View-Specific Component

**Scenario**: Create a `FileUploadProgress` component for Drive view only.

```
1. Check if it's view-specific: ✅ Yes (only used in Drive)

2. Create in view components:
   views/Drive/components/
   └── FileUploadProgress/
       ├── FileUploadProgress.tsx
       ├── FileUploadProgress.scss
       └── index.ts

3. Use only within Drive view:
   import { FileUploadProgress } from '../components/FileUploadProgress';
```

---

## Migration Strategy

The project is currently migrating from the old structure (`src/app/`) to the new view-based structure (`src/views/`).

### Migration Checklist

When migrating a module:

- [ ] Create new view directory in `src/views/`
- [ ] Move view component to `views/[ViewName]/index.tsx`
- [ ] Move view-specific components to `views/[ViewName]/components/`
- [ ] Move common components to `src/common/components/`
- [ ] Move services to appropriate location
- [ ] Move Redux slices to appropriate location
- [ ] Update all import paths
- [ ] Update tests
- [ ] Remove old module directory

---

## Questions?

If you have questions about the architecture, refer to:

- [CODE_STYLE.md](./CODE_STYLE.md) - Coding standards and conventions
- [README.md](../README.md) - Project overview
