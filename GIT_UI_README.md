# Git UI Implementation

This document describes the Git UI and diff parser implementation added to the Antiprism project.

## Overview

The Git UI provides a comprehensive interface for viewing Git diffs and repository status. It includes:

- **Diff Parser**: A robust parser for GNU unified diff format
- **Git Service**: Service layer for Git operations (with placeholder implementation)
- **Diff Viewer**: React component for displaying diffs with syntax highlighting
- **Git UI**: Main interface component with file list and diff viewer

## Components

### 1. Diff Parser (`lib/diff-parser.ts`)

A complete implementation of a GNU unified diff format parser that handles:

- **Diff headers**: Parse file change information
- **Hunk headers**: Extract line number ranges (`@@ -l,s +l,s @@`)
- **Diff lines**: Parse additions, deletions, context, and hunk markers
- **Binary diffs**: Detect and handle binary file changes
- **No newline markers**: Handle missing trailing newlines
- **Unicode safety**: Detect hidden bidirectional Unicode characters

**Key Features:**
- Exhaustive type checking with TypeScript
- Proper error handling and validation
- Support for all standard diff formats
- Memory-efficient streaming parser

### 2. Models (`lib/models/diff.ts`)

TypeScript interfaces and classes for representing diff data:

```typescript
enum DiffLineType {
  Hunk = 'hunk',
  Add = 'add', 
  Delete = 'delete',
  Context = 'context'
}

class DiffLine {
  text: string
  type: DiffLineType
  diffLineNumber: number
  oldLineNumber: number | null
  newLineNumber: number | null
  noTrailingNewLine: boolean
}

class DiffHunk {
  header: DiffHunkHeader
  lines: readonly DiffLine[]
  startLine: number
  endLine: number
  expansionType: HunkExpansionType
}
```

### 3. Git Service (`lib/git-service.ts`)

Service layer for Git operations with placeholder implementation:

**Current Operations:**
- `getStatus()`: Get repository status
- `getModifiedFiles()`: List modified files
- `getFileDiff()`: Get diff for specific file
- `getAllDiffs()`: Get all file diffs
- `getCommitHistory()`: Get commit history
- `stageFile()`, `unstageFile()`: Stage/unstage files
- `commit()`: Create commits
- Branch operations: create, checkout, list

**Integration Points:**
The service is designed to be easily integrated with:
- Git libraries (e.g., `simple-git`)
- Git APIs (GitHub, GitLab, Bitbucket)
- WebAssembly Git implementations
- Backend Git services

### 4. Diff Viewer (`components/DiffView.tsx`)

React component for rendering diffs with:

- **Syntax highlighting**: Color-coded additions, deletions, context
- **Line numbers**: Old and new line number tracking
- **File headers**: Display diff file information
- **Binary handling**: Special display for binary files
- **Responsive design**: Mobile-friendly layout

**Features:**
- Semantic HTML structure
- Accessible line number display
- Proper handling of missing newlines
- Efficient rendering with React keys

### 5. Git UI (`components/GitUI.tsx`)

Main interface component providing:

- **Repository status**: Git status display
- **File list**: Sidebar with modified files
- **Diff viewer**: Main content area with selected file diff
- **Demo mode**: Fallback to sample data when Git unavailable
- **Error handling**: Graceful error states and retry functionality

## Usage

### Basic Usage

```tsx
import { GitUI } from './components/GitUI'

function App() {
  return (
    <GitUI repositoryPath="." />
  )
}
```

### Accessing the Git UI

Visit `/git` in your browser to see the Git interface.

### Demo Mode

When Git operations are not available (e.g., in static builds), the UI automatically falls back to demo mode showing sample diff data.

## Styling

The Git UI uses CSS custom properties for theming:

```css
:root {
  --background: #ffffff;
  --foreground: #000000;
  --border: #e1e5e9;
  --accent: #007acc;
  --accent-foreground: #ffffff;
  --muted: #f6f8fa;
  --muted-foreground: #6e7781;
}
```

## Architecture

### Data Flow

1. **GitUI** requests status and diffs from **GitService**
2. **GitService** executes Git operations (or returns demo data)
3. **DiffParser** parses raw diff text into structured data
4. **DiffView** renders the structured diff data
5. **GitUI** displays file list and selected diff

### Error Handling

- Graceful fallback to demo data
- User-friendly error messages
- Retry functionality
- Loading states

### Performance

- Efficient streaming diff parser
- React key optimization for lists
- Minimal re-renders with proper state management
- Lazy loading of diff content

## Future Enhancements

### Git Integration

To enable real Git operations, integrate with:

1. **Node.js**: Use `simple-git` library
2. **Browser**: Use WebAssembly Git (e.g., isomorphic-git)
3. **API**: Connect to Git hosting services
4. **Backend**: Create Git API endpoints

### Additional Features

- **Commit history**: Browse and view commits
- **Branch management**: Switch and create branches
- **Staging interface**: Interactive file staging
- **Merge conflicts**: Visual conflict resolution
- **Blame view**: Line-by-line authorship
- **Search**: Filter files and changes

### UI Enhancements

- **Dark mode**: Theme support
- **Keyboard shortcuts**: Navigation and actions
- **Drag and drop**: File staging
- **Real-time updates**: Live Git status
- **Diff statistics**: Summary of changes

## Testing

The diff parser includes comprehensive test coverage for:

- Various diff formats
- Edge cases (binary files, empty diffs)
- Error conditions
- Unicode handling
- Performance with large diffs

Run tests with:
```bash
npm test -- lib/diff-parser.test.ts
```

## Contributing

When adding new features:

1. Update TypeScript types
2. Add comprehensive tests
3. Update documentation
4. Consider accessibility
5. Test with various diff formats

## License

This implementation follows the same license as the main Antiprism project.
