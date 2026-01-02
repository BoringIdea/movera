# Loading Components

This directory contains various loading components designed to provide a consistent and beautiful loading experience across the application.

## Components

### 1. LoadingOverlay

A versatile loading component with customizable size, text, and background.

```tsx
import { LoadingOverlay } from "@/components/ui/loading-overlay";

<LoadingOverlay 
  size="md"           // "sm" | "md" | "lg"
  text="Loading..."   // Custom loading text
  showBackground={true} // Whether to show background
  className="custom-class" // Additional CSS classes
/>
```

**Props:**
- `size`: Loading spinner size ("sm", "md", "lg")
- `text`: Loading text to display
- `showBackground`: Whether to show the background gradient
- `className`: Additional CSS classes

### 2. FullPageLoading

A full-page loading component with header, progress bar, and decorative elements.

```tsx
import { FullPageLoading } from "@/components/ui/loading-overlay";

<FullPageLoading 
  text="Loading Dashboard"  // Custom loading text
  showHeader={true}         // Whether to show header placeholder
/>
```

**Props:**
- `text`: Main loading text
- `showHeader`: Whether to show a header placeholder

### 3. PageTransitionLoading

A page transition loading component for route changes.

```tsx
import { PageTransitionLoading } from "@/components/ui/loading-overlay";

<PageTransitionLoading 
  text="Loading Page..."    // Custom loading text
  showProgress={true}       // Whether to show progress bar
/>
```

**Props:**
- `text`: Loading text
- `showProgress`: Whether to show the progress indicator

### 4. SkeletonLoading

A skeleton loading component for content placeholders.

```tsx
import { SkeletonLoading } from "@/components/ui/loading-overlay";

<SkeletonLoading 
  lines={3}           // Number of skeleton lines
  showAvatar={false}  // Whether to show avatar skeleton
  className="custom-class" // Additional CSS classes
/>
```

**Props:**
- `lines`: Number of skeleton lines to display
- `showAvatar`: Whether to show avatar skeleton
- `className`: Additional CSS classes

### 5. PageTransition

A global page transition component that automatically shows loading on route changes.

```tsx
// Add to root layout
import { PageTransition } from "@/components/ui/page-transition";

<PageTransition />
```

This component automatically detects route changes and shows appropriate loading states.

## Usage Examples

### Basic Loading
```tsx
function MyComponent() {
  const [isLoading, setIsLoading] = useState(true);
  
  if (isLoading) {
    return <LoadingOverlay size="lg" text="Loading data..." />;
  }
  
  return <div>Content loaded!</div>;
}
```

### Full Page Loading
```tsx
function MyPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  if (isLoading) {
    return <FullPageLoading text="Loading Page" showHeader={true} />;
  }
  
  return <div>Page content</div>;
}
```

### Skeleton Loading
```tsx
function ContentList() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  if (isLoading) {
    return <SkeletonLoading lines={5} showAvatar={true} />;
  }
  
  return <div>List of items</div>;
}
```

### Error States
```tsx
function MyComponent() {
  const [error, setError] = useState(null);
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Title</h2>
          <p className="text-gray-600">Error description</p>
        </div>
      </div>
    );
  }
  
  return <div>Content</div>;
}
```

## Design Features

- **Consistent Theme**: All components use the same blue color scheme
- **Smooth Animations**: CSS animations for spinner, dots, and progress bars
- **Responsive Design**: Works on all screen sizes
- **Accessibility**: Proper contrast and readable text
- **Customizable**: Easy to customize size, text, and appearance

## Best Practices

1. **Use appropriate sizes**: Use "sm" for inline loading, "md" for content areas, "lg" for full sections
2. **Provide meaningful text**: Always include descriptive loading text
3. **Handle errors gracefully**: Show user-friendly error messages with icons
4. **Consistent timing**: Use minimum loading times to avoid flickering
5. **Background consistency**: Use `showBackground={false}` when loading within existing content areas
