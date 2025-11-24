# Testing Guidelines

## Philosophy

Tests should focus on **behavior and outcomes** rather than implementation details. This makes tests more resilient to refactoring and easier to understand for anyone reading the codebase.

## Test Structure Pattern

### 1. Main Describe Block

Use clear, descriptive names that identify **what** is being tested, not **how** it works internally.

```typescript
// ✅ Good - Describes what is being tested
describe('OAuth custom hook', () => { ... })
describe('User authentication service', () => { ... })
describe('File upload component', () => { ... })

// ❌ Bad - Uses technical variable/function names
describe('useOAuthFlow', () => { ... })
describe('authService.login', () => { ... })
describe('FileUpload', () => { ... })
```

### 2. Nested Describe Blocks

Use context-based groupings with **Given/When** format:

```typescript
// ✅ Good - Describes context and scenarios
describe('Auth origin', () => { ... })
describe('On component mount', () => { ... })
describe('Handling successful OAuth', () => { ... })
describe('When user is authenticated', () => { ... })
describe('File validation', () => { ... })

// ❌ Bad - Uses technical property/method names
describe('isOAuthFlow property', () => { ... })
describe('handleOAuthSuccess method', () => { ... })
describe('validateFile function', () => { ... })
```

### 3. Test Cases (it blocks)

Use **"when X, then Y"** format to clearly express cause and effect:

```typescript
// ✅ Good - Clear behavior with expected outcome
it('when an auth origin is provided, then the OAuth process is activated', () => { ... })
it('when the file size exceeds the limit, then an error is shown', () => { ... })
it('when the form is submitted with valid data, then the user is created successfully', () => { ... })

// ❌ Bad - Uses technical details or unclear expectations
it('should set isOAuthFlow to true when authOrigin is provided', () => { ... })
it('should return false if file.size > MAX_SIZE', () => { ... })
it('should call createUser with formData', () => { ... })
```

## Complete Example

```typescript
describe('OAuth custom hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auth origin', () => {
    it('when an auth origin is provided, then the OAuth process is activated', () => {
      const { result } = renderHook(() => useOAuthFlow({ authOrigin: 'https://meet.internxt.com' }));

      expect(result.current.isOAuthFlow).toBe(true);
    });

    it('when an auth origin is not provided, then the OAuth process remains inactive', () => {
      const { result } = renderHook(() => useOAuthFlow({ authOrigin: null }));

      expect(result.current.isOAuthFlow).toBe(false);
    });
  });

  describe('On component mount', () => {
    it('when OAuth is active and user credentials exist, then credentials are automatically sent to the parent window', () => {
      vi.spyOn(localStorageService, 'getUser').mockReturnValue(mockUserSettings);
      vi.spyOn(localStorageService, 'get').mockReturnValue('test-token');
      mockSendAuthSuccess.mockReturnValue(true);

      renderHook(() => useOAuthFlow({ authOrigin: 'https://meet.internxt.com' }));

      expect(mockSendAuthSuccess).toHaveBeenCalledWith(mockUserSettings, 'test-token');
    });

    it('when OAuth is not active, then no credentials are sent', () => {
      renderHook(() => useOAuthFlow({ authOrigin: null }));

      expect(mockSendAuthSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Handling successful OAuth', () => {
    it('when the OAuth process completes successfully, then credentials are sent and success is reported', () => {
      mockSendAuthSuccess.mockReturnValue(true);

      const { result } = renderHook(() => useOAuthFlow({ authOrigin: 'https://meet.internxt.com' }));
      const returnValue = result.current.handleOAuthSuccess(mockUserSettings, 'token');

      expect(returnValue).toBe(true);
    });

    it('when the OAuth process fails or is not completed, then failure is reported', () => {
      mockSendAuthSuccess.mockReturnValue(false);

      const { result } = renderHook(() => useOAuthFlow({ authOrigin: 'https://meet.internxt.com' }));
      const returnValue = result.current.handleOAuthSuccess(mockUserSettings, 'token');

      expect(returnValue).toBe(false);
    });
  });
});
```

## Service/Function Testing

For services and utility functions, follow the same pattern:

```typescript
describe('Authentication service', () => {
  describe('User login', () => {
    it('when credentials are valid, then the user is authenticated and a token is returned', () => {
      const result = authService.login('user@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
    });

    it('when credentials are invalid, then authentication fails with an error message', () => {
      const result = authService.login('user@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('Password validation', () => {
    it('when password meets all requirements, then validation passes', () => {
      const isValid = authService.validatePassword('SecurePass123!');

      expect(isValid).toBe(true);
    });

    it('when password is too short, then validation fails', () => {
      const isValid = authService.validatePassword('short');

      expect(isValid).toBe(false);
    });
  });
});
```

## Key Principles

### 1. Avoid Technical Implementation Details

❌ **Bad:**
- Variable names: `isOAuthFlow`, `mockSendAuthSuccess`, `authOrigin`
- Function names: `handleOAuthSuccess`, `sendAuthSuccess`
- Property names: `result.current.isOAuthFlow`

✅ **Good:**
- Behaviors: "OAuth process is activated", "credentials are sent"
- Outcomes: "success is reported", "error is shown"
- States: "user is authenticated", "form is valid"

### 2. Use Domain Language

Write tests in language that non-technical stakeholders could understand.

❌ **Bad:**
```typescript
it('should call postMessage with credentials and close window', () => { ... })
```

✅ **Good:**
```typescript
it('when authentication succeeds, then user credentials are transmitted to the parent application', () => { ... })
```

### 3. Group by Behavior, Not by Code Structure

❌ **Bad:**
```typescript
describe('sendAuthSuccess method', () => {
  describe('when window.opener exists', () => { ... })
  describe('when window.opener is null', () => { ... })
})
```

✅ **Good:**
```typescript
describe('Successful authentication transmission', () => {
  it('when the parent window is available, then credentials are transmitted successfully', () => { ... })
  it('when there is no parent window, then transmission fails gracefully', () => { ... })
})
```

### 4. Test Outcomes, Not Implementations

❌ **Bad:**
```typescript
it('should call localStorage.setItem with user data', () => {
  service.saveUser(userData);
  expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(userData));
})
```

✅ **Good:**
```typescript
it('when user data is saved, then it persists across sessions', () => {
  service.saveUser(userData);
  const retrieved = service.getUser();
  expect(retrieved).toEqual(userData);
})
```

### 5. Avoid Console Logging Assertions

❌ **Bad:**
```typescript
it('should log warning when origin is invalid', () => {
  expect(consoleWarnSpy).toHaveBeenCalledWith('[OAuth] Invalid origin');
})
```

✅ **Good:**
Focus on behavior that affects the user or system state, not internal logging.

## Benefits

1. **Resilient to Refactoring**: If you rename variables or functions, test descriptions remain accurate
2. **Self-Documenting**: Tests serve as behavior documentation
3. **Easier to Understand**: New team members can understand what the code does without knowing implementation
4. **Better Coverage**: Thinking in behaviors helps identify edge cases
5. **Maintainable**: When implementation changes, tests remain relevant if behavior is preserved

## Checklist

Before committing tests, verify:

- [ ] Main describe block describes **what** is being tested, not implementation details
- [ ] Nested describe blocks use context-based grouping (Auth origin, On mount, etc.)
- [ ] Test cases use "when X, then Y" format
- [ ] No variable names, function names, or property names in descriptions
- [ ] Tests read like plain English sentences
- [ ] Someone unfamiliar with the code could understand what's being tested
- [ ] Tests focus on outcomes and behaviors, not internal implementation
- [ ] No assertions on console logs unless absolutely necessary
