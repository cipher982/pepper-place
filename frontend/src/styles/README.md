# Pepper Place Styling Documentation

## Directory Structure

This directory contains all styling-related files for the Pepper Place application:

- `theme.ts` - Central theme configuration with colors, spacing, typography, etc.
- `styled.d.ts` - TypeScript declarations for styled-components theme
- `GlobalStyles.ts` - Global styles for the entire application
- Component-specific style files:
  - `App.styles.ts` - Styled components for App.tsx
  - `Timeline.styles.ts` - Styled components for Timeline.tsx
  - `PhotoGallery.styles.ts` - Styled components for PhotoGallery.tsx

## Styling Approach

The application uses styled-components with a centralized theme. This approach offers several benefits:

1. **Consistency**: Design tokens are defined in a single theme file
2. **Type Safety**: Full TypeScript integration for style properties
3. **Component-based**: Styles are co-located with their components
4. **Theme-ability**: Easy to implement dark mode or alternate themes
5. **Scoped styles**: No global CSS conflicts

## Using the Theme

To use theme values in styled components:

```tsx
// Accessing theme properties
const MyComponent = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;
```

## Adding New Styled Components

When creating new UI elements:

1. Add the styled component to the appropriate component-specific style file
2. Use theme values for all properties where applicable
3. For reusable components, consider creating a new style file

## Modifying the Theme

To add new theme values:

1. Add the new property to `theme.ts`
2. Update the `DefaultTheme` interface in `styled.d.ts`
3. Use the new theme value in your styled components

## Common Patterns

- Use `theme.spacing` properties for layout measurements
- Use `theme.colors` for all color values
- Use `theme.typography` for font-related properties
- Use `theme.transitions` for animation timings

## Best Practices

- Keep styles organized by component
- Avoid inline styles in component JSX
- Always use theme values for consistency
- Name styled components semantically based on their purpose
- Use CSS comments for complex or non-obvious styles 