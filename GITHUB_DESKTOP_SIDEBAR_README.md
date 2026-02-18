# GitHub Desktop Sidebar Implementation

A complete GitHub Desktop-style sidebar layout implementation for the Antiprism project, featuring resizable panels, tab navigation, file management, and commit functionality.

## Overview

This implementation replicates the GitHub Desktop sidebar interface with:

- **Resizable Sidebar**: Drag-to-resize with persistent width
- **Tab Navigation**: Changes and History tabs with badges
- **File Management**: Checkbox selection, status indicators, diff viewing
- **Commit Interface**: Summary, description, co-authors, and commit actions
- **Branch Management**: Branch filtering and history viewing
- **Responsive Design**: Mobile-friendly with proper breakpoints

## Architecture

### Component Structure

```
components/
├── GitHubDesktopSidebar.tsx    # Main sidebar component
├── GitHubDesktopSidebar.css     # Comprehensive styling
└── ui/                          # Reusable UI components
    ├── TabBar.tsx              # Tab navigation
    ├── Resizable.tsx           # Resizable panel wrapper
    ├── List.tsx                # Virtual list implementation
    └── ui.css                  # UI component styles
```

### Data Flow

```
GitHubDesktopSidebar
├── ChangesSidebar
│   ├── ChangesList
│   └── CommitMessageForm
└── CompareSidebar
    ├── BranchFilter
    └── CommitHistory
```

## Features

### 1. Resizable Sidebar

**Implementation:**
```tsx
<Resizable
  id="repository-sidebar"
  width={sidebarWidth}
  maximumWidth={400}
  minimumWidth={200}
  onReset={handleSidebarWidthReset}
  onResize={handleSidebarResize}
>
  {sidebarContent}
</Resizable>
```

**Features:**
- Drag-to-resize with visual feedback
- Double-click to reset to default width
- Constrained min/max width (200px-400px)
- Persistent width storage (localStorage ready)
- Smooth resize animations

### 2. Tab Navigation

**Implementation:**
```tsx
<TabBar selectedIndex={selectedTab} onTabClicked={handleTabClick}>
  <span className="with-indicator">
    <span>Changes</span>
    {changesBadge}
  </span>
  <span className="with-indicator">
    <span>History</span>
  </span>
</TabBar>
```

**Features:**
- Changes tab with file count badge
- History tab for commit/branch viewing
- Active tab highlighting
- Smooth transitions
- Keyboard navigation support

### 3. Changes Sidebar

**File List Features:**
- Checkbox selection for staging/unstaging
- File status indicators (modified, added, deleted, etc.)
- Multi-selection support
- Select all/deselect all functionality
- File count display

**Commit Form Features:**
- User avatar display
- Summary input field
- Description textarea
- Co-author toggle
- Copilot integration button
- Commit button with validation

### 4. Compare Sidebar (History)

**Features:**
- Branch filtering with search
- Branch list display
- Commit history view
- Branch selection
- Comparison view

### 5. Diff Viewer

**Features:**
- Syntax-highlighted diff display
- Line number tracking
- File selection from sidebar
- Hunk headers
- Add/delete/context line styling
- Responsive layout

## Styling System

### CSS Architecture

The styling uses CSS custom properties for theming:

```css
:root {
  --background: #ffffff;
  --foreground: #24292f;
  --border: #d0d7de;
  --accent: #0969da;
  --sidebar-background: #f6f8fa;
  --panel-background: #ffffff;
}
```

### Dark Theme Support

Automatic dark theme detection with comprehensive color overrides:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0d1117;
    --foreground: #e6edf3;
    --border: #30363d;
    --accent: #58a6ff;
  }
}
```

### Responsive Design

- **Desktop**: Full sidebar with resizable panels
- **Mobile**: Full-width sidebar with toggle
- **Tablet**: Optimized widths and touch targets

## State Management

### Component State

```tsx
interface GitHubDesktopSidebarState {
  selectedTab: RepositorySectionTab
  sidebarWidth: number
  workingDirectory: WorkingDirectoryFile[]
  commitMessage: CommitMessage
  compareState: CompareState
  selectedFiles: Set<number>
  isCommitting: boolean
}
```

### Data Models

```typescript
interface WorkingDirectoryFile {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'
  included: boolean
  selected: boolean
  diff?: IRawDiff
}

interface CommitMessage {
  summary: string
  description: string
  coAuthors: string[]
}
```

## Integration Points

### Git Service Integration

The sidebar integrates with the existing `GitService`:

```tsx
const gitService = new GitService()
const diffs = await gitService.getAllDiffs(repositoryPath)
```

### Demo Mode

When Git operations are unavailable, falls back to demo data:

```tsx
if (files.length === 0) {
  const demoDiffs = createDemoDiffs()
  // Use demo data
}
```

## Usage

### Basic Usage

```tsx
import { GitHubDesktopSidebar } from './components/GitHubDesktopSidebar'

function GitPage() {
  return (
    <div className="git-page">
      <GitHubDesktopSidebar repositoryPath="." />
    </div>
  )
}
```

### Advanced Configuration

```tsx
<GitHubDesktopSidebar
  repositoryPath="."
  sidebarWidth={300}
  onSidebarResize={(width) => {
    // Handle resize
    localStorage.setItem('sidebar-width', width.toString())
  }}
/>
```

## Accessibility

### ARIA Support

- Proper tab roles and labels
- Keyboard navigation
- Focus management
- Screen reader support

### Keyboard Shortcuts

- `Tab`: Navigate between elements
- `Space/Enter`: Select items
- `Arrow keys`: Navigate lists
- `Escape`: Cancel actions

## Performance

### Optimizations

- Virtual list rendering for large file lists
- Efficient state updates
- Debounced resize handling
- Lazy loading of diff content

### Memory Management

- Proper cleanup of event listeners
- Component unmount handling
- Efficient diff parsing

## Browser Support

### Modern Browsers

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Features Used

- CSS Grid and Flexbox
- CSS Custom Properties
- ResizeObserver API
- Modern JavaScript (ES2020)

## Customization

### Theming

Override CSS custom properties:

```css
:root {
  --accent: #your-brand-color;
  --sidebar-background: #your-sidebar-bg;
}
```

### Component Extensions

Extend components with additional props:

```tsx
interface CustomSidebarProps extends GitHubDesktopSidebarProps {
  customFeature?: boolean
}
```

## Testing

### Unit Tests

Test component behavior:

```tsx
test('should handle file selection', () => {
  const { getByRole } = render(<GitHubDesktopSidebar />)
  // Test selection logic
})
```

### Integration Tests

Test Git integration:

```tsx
test('should load and display diffs', async () => {
  // Test Git service integration
})
```

## Future Enhancements

### Planned Features

1. **Real Git Integration**: Connect to actual Git operations
2. **Branch Management**: Create, delete, merge branches
3. **Conflict Resolution**: Visual merge conflict interface
4. **Stash Management**: Stash and pop changes
5. **Remote Operations**: Push/pull/fetch functionality
6. **Blame View**: Line-by-line authorship
7. **Search**: File and content search
8. **Keyboard Shortcuts**: Customizable shortcuts

### Performance Improvements

1. **Web Workers**: Offload diff parsing
2. **Virtual Scrolling**: Better large repository support
3. **Caching**: Cache parsed diffs and metadata
4. **Lazy Loading**: Load diffs on demand

## Troubleshooting

### Common Issues

1. **Resize Handle Not Working**: Check CSS z-index and pointer-events
2. **Tab Switching Issues**: Verify state management
3. **File Selection Problems**: Check event handling
4. **Styling Issues**: Verify CSS custom properties

### Debug Mode

Enable debug logging:

```tsx
<GitHubDesktopSidebar debug={true} />
```

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development: `npm run dev`
4. Navigate to `/git` to see the sidebar

### Code Style

- Use TypeScript for all components
- Follow React hooks patterns
- Use CSS custom properties for theming
- Implement proper error boundaries
- Add comprehensive tests

### Pull Request Process

1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit pull request with description

## License

This implementation follows the same license as the main Antiprism project.

---

**Note**: This implementation provides a complete GitHub Desktop-style sidebar experience with modern React patterns, comprehensive styling, and extensibility for future enhancements.
