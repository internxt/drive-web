# Code Style Guide

This document defines the coding standards, conventions, and best practices for Internxt Drive Web.

## Table of Contents

- [TypeScript Guidelines](#typescript-guidelines)
- [React Guidelines](#react-guidelines)
- [Component Organization](#component-organization)
- [Hooks Guidelines](#hooks-guidelines)
- [Styling Guidelines](#styling-guidelines)
- [Naming Conventions](#naming-conventions)
- [File Organization](#file-organization)
- [Import Organization](#import-organization)
- [Testing Guidelines](#testing-guidelines)
- [Comments and Documentation](#comments-and-documentation)
- [Performance Best Practices](#performance-best-practices)
- [Accessibility](#accessibility)

---

## TypeScript Guidelines

### Always Use TypeScript

Avoid `any` types. Use proper types or `unknown` if type is truly unknown.

```tsx
// ❌ Bad
const data: any = fetchData();

// ✅ Good
const data: UserData = fetchData();

// ✅ Good (when type is unknown)
const data: unknown = fetchData();
if (isUserData(data)) {
  // Type guard
  // data is UserData here
}
```

### Define Interfaces for Props

Always define explicit interfaces for component props.

```tsx
// ✅ Good
interface FileListProps {
  files: File[];
  onFileClick: (file: File) => void;
  isLoading?: boolean;
  className?: string;
}

const FileList: React.FC<FileListProps> = ({ files, onFileClick, isLoading = false, className }) => {
  // ...
};

export default FileList;
```

### Use Type Inference When Obvious

Don't over-annotate when TypeScript can infer the type.

```tsx
// ❌ Bad (unnecessary annotation)
const count: number = items.length;
const name: string = 'John';

// ✅ Good (let TypeScript infer)
const count = items.length;
const name = 'John';

// ✅ Good (annotation needed)
const [user, setUser] = useState<User | null>(null);
```

### Use Union Types for String Literals

```tsx
// ✅ Good
type FileStatus = 'pending' | 'uploading' | 'completed' | 'error';

interface File {
  id: string;
  status: FileStatus;
}

// ❌ Bad
interface File {
  id: string;
  status: string; // Too loose
}
```

### Use `readonly` for Immutable Data

```tsx
// ✅ Good
interface Config {
  readonly apiUrl: string;
  readonly timeout: number;
}

type ReadonlyArray<T> = readonly T[];
```

### Generic Types

```tsx
// ✅ Good
interface ApiResponse<T> {
  data: T;
  error?: string;
  loading: boolean;
}

function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  // ...
}
```

---

## React Guidelines

### Component Structure

Follow a consistent component structure:

```tsx
import React, { useState, useEffect } from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface ComponentNameProps {
  // Props definition
  title: string;
  onAction: () => void;
}

const ComponentName: React.FC<ComponentNameProps> = ({ title, onAction }) => {
  // 1. Hooks (React hooks first, then custom hooks)
  const { translate } = useTranslationContext();
  const [isOpen, setIsOpen] = useState(false);

  // 2. Effects
  useEffect(() => {
    // Side effects
  }, []);

  // 3. Event Handlers
  const handleClick = () => {
    setIsOpen(true);
    onAction();
  };

  // 4. Render Helpers (if needed)
  const renderContent = () => {
    if (!isOpen) return null;
    return <div>{title}</div>;
  };

  // 5. Return JSX
  return (
    <div className="component-name">
      <button onClick={handleClick}>{translate('button.label')}</button>
      {renderContent()}
    </div>
  );
};

export default ComponentName;
```

### Functional Components Only

Use functional components with hooks (no class components).

```tsx
// ✅ Good
const FileList: React.FC<FileListProps> = ({ files }) => {
  const [selected, setSelected] = useState<string[]>([]);
  return <div>{/* ... */}</div>;
};

// ❌ Bad (don't use class components)
class FileList extends React.Component<FileListProps> {
  // ...
}
```

### Props Destructuring

Destructure props in the function signature.

```tsx
// ✅ Good
const FileItem: React.FC<FileItemProps> = ({ file, onSelect, isSelected = false }) => {
  return <div>{file.name}</div>;
};

// ❌ Bad
const FileItem: React.FC<FileItemProps> = (props) => {
  return <div>{props.file.name}</div>;
};
```

### Default Props

Use default parameter values instead of `defaultProps`.

```tsx
// ✅ Good
const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'medium', disabled = false }) => {
  // ...
};

// ❌ Bad (deprecated pattern)
Button.defaultProps = {
  variant: 'primary',
  size: 'medium',
};
```

### Conditional Rendering

```tsx
// ✅ Good (using &&)
{
  isLoading && <Loader />;
}

// ✅ Good (using ternary)
{
  isLoading ? <Loader /> : <Content />;
}

// ✅ Good (early return)
if (!data) return <EmptyState />;
return <Content data={data} />;

// ❌ Bad (unnecessary ternary)
{
  isLoading ? <Loader /> : null;
} // Use && instead
```

### Lists and Keys

Always use unique, stable keys for list items.

```tsx
// ✅ Good (using unique ID)
{
  files.map((file) => <FileItem key={file.id} file={file} />);
}

// ❌ Bad (using index)
{
  files.map((file, index) => <FileItem key={index} file={file} />);
}
```

---

## Component Organization

### Complex Components (Folder)

Use a folder when component has:

- Tests
- Sub-components
- Helper functions

```
FileList/
├── FileList.tsx                # Main component
├── FileList.test.tsx          # Tests
├── components/                # Sub-components
│   ├── FileListItem.tsx
│   └── FileListHeader.tsx
├── helpers.ts                 # Helper functions
└── index.ts                   # Barrel export
```

**index.ts (barrel export):**

```tsx
export { default } from './FileList';
export type { FileListProps } from './FileList';
```

### Simple Components (File)

Use a single file when component is standalone.

```
FileItem.tsx                   # Single file component
```

---

## Hooks Guidelines

### Hook Order

Always call hooks at the top of the component in consistent order:

1. React hooks (useState, useEffect, useRef, etc.)
2. Router hooks (useParams, useNavigate, etc.)
3. Redux hooks (useSelector, useDispatch)
4. Custom hooks

```tsx
const MyComponent = () => {
  // 1. React hooks
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // 2. Router hooks
  const { id } = useParams();
  const navigate = useNavigate();

  // 3. Redux hooks
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();

  // 4. Custom hooks
  const { data, loading } = useFiles();

  // Rest of component...
};
```

### Custom Hooks

Custom hooks should:

- Start with `use` prefix
- Return an object or array
- Be self-contained and reusable

```tsx
// ✅ Good
export const useFiles = (folderId: string) => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFiles(folderId).then(setFiles);
  }, [folderId]);

  return { files, loading };
};

// Usage
const { files, loading } = useFiles(folderId);
```

### Effect Dependencies

Always include all dependencies in the dependency array.

```tsx
// ✅ Good
useEffect(() => {
  fetchFiles(folderId, userId);
}, [folderId, userId]); // All dependencies listed

// ❌ Bad
useEffect(() => {
  fetchFiles(folderId, userId);
}, []); // Missing dependencies
```

### Avoid Unnecessary Effects

```tsx
// ❌ Bad (unnecessary effect)
const [count, setCount] = useState(0);
const [doubled, setDoubled] = useState(0);

useEffect(() => {
  setDoubled(count * 2);
}, [count]);

// ✅ Good (derived state)
const [count, setCount] = useState(0);
const doubled = count * 2;
```

---

## Styling Guidelines

### Tailwind CSS

Use Tailwind for utility classes.

```tsx
// ✅ Good (Tailwind utilities)
<div className="flex items-center justify-between p-4 bg-gray-100">
  <span className="text-lg font-bold">Title</span>
  <button className="btn btn-primary">Action</button>
</div>
```

### Avoid Inline Styles

```tsx
// ❌ Bad
<div style={{ display: 'flex', padding: '10px' }}>
  Content
</div>

// ✅ Good (Tailwind)
<div className="flex p-2.5">
  Content
</div>
```

---

## Naming Conventions

### Files and Folders

| Type       | Convention                    | Example                              |
| ---------- | ----------------------------- | ------------------------------------ |
| Components | PascalCase                    | `FileList.tsx`, `ShareDialog.tsx`    |
| Hooks      | camelCase + `use` prefix      | `useFiles.ts`, `useAuth.ts`          |
| Services   | camelCase + `.service` suffix | `file.service.ts`, `auth.service.ts` |
| Utils      | camelCase                     | `formatDate.ts`, `fileUtils.ts`      |
| Types      | camelCase + `.types` suffix   | `file.types.ts`, `user.types.ts`     |
| Tests      | Same as component + `.test`   | `FileList.test.tsx`                  |
| Constants  | camelCase or UPPER_SNAKE_CASE | `routes.ts`, `API_ENDPOINTS.ts`      |

### Variables

```tsx
// Variables: camelCase
const fileCount = 10;
const isLoading = false;
const userName = 'John';

// Boolean variables: use is/has/should prefix
const isVisible = true;
const hasPermission = false;
const shouldRefresh = true;

// Arrays: plural nouns
const files = [];
const users = [];

// Functions: camelCase, verb prefix
const handleClick = () => {};
const fetchFiles = async () => {};
const validateForm = () => {};
const isValidEmail = (email: string) => boolean;
```

### Functions

Use descriptive verb prefixes:

| Prefix     | Meaning              | Example                             |
| ---------- | -------------------- | ----------------------------------- |
| `get`      | Return data          | `getFiles()`, `getUserName()`       |
| `set`      | Set data             | `setLoading()`, `setUser()`         |
| `fetch`    | Async data retrieval | `fetchFiles()`, `fetchUserData()`   |
| `handle`   | Event handlers       | `handleClick()`, `handleSubmit()`   |
| `validate` | Validation           | `validateForm()`, `validateEmail()` |
| `is`       | Boolean check        | `isValid()`, `isLoading()`          |
| `has`      | Boolean check        | `hasPermission()`, `hasAccess()`    |
| `should`   | Boolean check        | `shouldRefresh()`, `shouldRender()` |
| `on`       | Callback props       | `onSubmit`, `onClick`, `onClose`    |

### Components

```tsx
// Components: PascalCase
const FileList = () => {};
const ShareDialog = () => {};
const UserAvatar = () => {};
```

### Interfaces and Types

```tsx
// Interfaces: PascalCase
interface FileListProps {
  files: File[];
}

interface UserData {
  id: string;
  name: string;
}

// Types: PascalCase
type FileStatus = 'pending' | 'uploaded' | 'error';
type ApiResponse<T> = {
  data: T;
  error?: string;
};

// Props interface naming
interface ComponentNameProps {} // ✅ Good
interface IComponentNameProps {} // ❌ Bad (no I prefix)
```

### Constants

```tsx
// App-wide constants: UPPER_SNAKE_CASE
export const MAX_FILE_SIZE = 1024 * 1024 * 100; // 100MB
export const API_BASE_URL = 'https://api.internxt.com';
export const DEFAULT_LANGUAGE = 'en';

// Config objects: camelCase or PascalCase
export const API_ENDPOINTS = {
  FILES: '/api/files',
  FOLDERS: '/api/folders',
};

export const ROUTES = {
  DRIVE: '/drive',
  SHARED: '/shared',
};
```

### Event Handlers

```tsx
// ✅ Good
const handleClick = () => {};
const handleSubmit = (e: FormEvent) => {};
const handleFileSelect = (file: File) => {};

// Props: use 'on' prefix
interface ButtonProps {
  onClick: () => void;
  onSubmit: (data: FormData) => void;
}
```

---

## File Organization

### Import Order

Organize imports in the following order:

```tsx
// 1. External libraries
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// 2. Internal aliases (app/)
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';

// 3. Shared (shared/)
import { Button } from 'shared/components/Button';
import { useAuth } from 'shared/hooks/useAuth';

// 4. Relative imports (same view)
import { FileList } from './components/FileList';
import { useFiles } from './hooks/useFiles';
```

### Export Order

```tsx
// 1. Type exports
export type { FileListProps };
export type { FileItem };

// 2. Named exports
export { FileListItem };
export { FileListHeader };

// 3. Default export (last)
export default FileList;
```

---

## Testing Guidelines

### Philosophy

Tests should focus on **behavior and outcomes** rather than implementation details. This makes tests more resilient to refactoring and easier to understand.

For comprehensive guidelines, see [testing-guidelines.md](../testing-guidelines.md).

### Test File Location

Place test files next to the component:

```
FileList/
├── FileList.tsx
└── FileList.test.tsx  ← Here
```

### Test Structure Pattern

#### 1. Main Describe Block

Use clear, descriptive names that identify **what** is being tested, not **how** it works internally.

```tsx
// ✅ Good - Describes what is being tested
describe('File list component', () => { ... })
describe('User authentication service', () => { ... })

// ❌ Bad - Uses technical variable/function names
describe('FileList', () => { ... })
describe('authService.login', () => { ... })
```

#### 2. Nested Describe Blocks

Use context-based groupings:

```tsx
// ✅ Good - Describes context and scenarios
describe('File rendering', () => { ... })
describe('When user clicks on a file', () => { ... })
describe('File validation', () => { ... })

// ❌ Bad - Uses technical property/method names
describe('renderFiles method', () => { ... })
describe('handleClick function', () => { ... })
```

#### 3. Test Cases

Use **"when X, then Y"** format to clearly express cause and effect:

```tsx
// ✅ Good - Clear behavior with expected outcome
it('when files are provided, then all file names are displayed', () => { ... })
it('when the file size exceeds the limit, then an error is shown', () => { ... })
it('when the user clicks on a file, then the file details are displayed', () => { ... })

// ❌ Bad - Uses technical details or unclear expectations
it('should render file list correctly', () => { ... })
it('should call onFileClick with file data', () => { ... })
it('should set isLoading to false', () => { ... })
```

### Complete Example

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FileList from './FileList';

describe('File list component', () => {
  const mockFiles = [
    { id: '1', name: 'file1.txt', size: 1024 },
    { id: '2', name: 'file2.txt', size: 2048 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File rendering', () => {
    it('when files are provided, then all file names are displayed', () => {
      render(<FileList files={mockFiles} />);

      expect(screen.getByText('file1.txt')).toBeInTheDocument();
      expect(screen.getByText('file2.txt')).toBeInTheDocument();
    });

    it('when no files are provided, then an empty state message is shown', () => {
      render(<FileList files={[]} />);

      expect(screen.getByText('No files')).toBeInTheDocument();
    });
  });

  describe('File interaction', () => {
    it('when a file is clicked, then the file selection handler is called with the correct file', () => {
      const handleClick = vi.fn();
      render(<FileList files={mockFiles} onFileClick={handleClick} />);

      fireEvent.click(screen.getByText('file1.txt'));

      expect(handleClick).toHaveBeenCalledWith(mockFiles[0]);
    });
  });

  describe('Loading state', () => {
    it('when the list is loading, then a loading indicator is displayed', () => {
      render(<FileList files={[]} isLoading={true} />);

      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });
  });
});
```

### Key Principles

#### ❌ Avoid

- Variable names in descriptions (`isLoading`, `fileList`)
- Function/method names (`handleClick`, `renderFiles`)
- Technical implementation details
- Console log assertions (unless critical)
- "should" at the start of test cases

#### ✅ Use

- Domain language (file, user, authentication)
- Clear outcomes (is displayed, is shown, succeeds, fails)
- "when/then" format for test cases
- Plain English that non-technical people can understand
- Focus on behavior and user-facing outcomes

---

## Comments and Documentation

### JSDoc for Public APIs

```tsx
/**
 * Formats a file size in bytes to a human-readable string.
 *
 * @param bytes - The size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted file size (e.g., "1.5 MB")
 *
 * @example
 * formatFileSize(1536000) // Returns "1.50 MB"
 * formatFileSize(1024, 0) // Returns "1 KB"
 */
export const formatFileSize = (bytes: number, decimals: number = 2): string => {
  // Implementation
};
```

### Inline Comments

```tsx
// ✅ Good (explains WHY, not WHAT)
// Delay is needed to prevent race condition with file upload
await delay(100);

// Clear cache before fetching to ensure fresh data
cache.clear();

// ❌ Bad (explains WHAT, which is obvious)
// Set loading to true
setLoading(true);

// Loop through files
files.forEach((file) => {});
```

## Performance Best Practices

### Memoization

Use `useMemo` and `useCallback` for expensive computations:

```tsx
// ✅ Good
const sortedFiles = useMemo(() => {
  return files.sort((a, b) => a.name.localeCompare(b.name));
}, [files]);

const handleClick = useCallback(() => {
  onFileClick(file);
}, [file, onFileClick]);
```

### React.memo for Pure Components

```tsx
// ✅ Good
const FileItem = React.memo<FileItemProps>(({ file, onSelect }) => {
  return <div>{file.name}</div>;
});
```

### Lazy Loading

```tsx
// ✅ Good
const FilePreview = lazy(() => import('./components/FilePreview'));

<Suspense fallback={<Loader />}>
  <FilePreview file={file} />
</Suspense>;
```

---

## Accessibility

### Semantic HTML

```tsx
// ✅ Good
<button onClick={handleClick}>Submit</button>
<nav>
  <a href="/drive">Drive</a>
</nav>

// ❌ Bad
<div onClick={handleClick}>Submit</div>
<div>
  <span onClick={() => navigate('/drive')}>Drive</span>
</div>
```

### ARIA Labels

```tsx
// ✅ Good
<button aria-label="Close dialog" onClick={onClose}>
  <X size={24} />
</button>

<input
  type="text"
  aria-label="Search files"
  placeholder="Search..."
/>
```

### Keyboard Navigation

```tsx
// ✅ Good
<div role="button" tabIndex={0} onClick={handleClick} onKeyDown={(e) => e.key === 'Enter' && handleClick()}>
  Click me
</div>
```

---

## Questions?

For more information, see:

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Project architecture
- [README.md](../README.md) - Project overview
