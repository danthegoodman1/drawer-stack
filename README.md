# iOS Card-Style Drawer Stack

A React component for creating iOS-style stacked drawer navigation using React Router.

Works in tandem with normal navigation - use full-page navigation for primary flows, or peek at routes with stackable drawers for quick previews.

Demo: https://x.com/Dan_The_Goodman/status/1938357207424503843

> [!WARNING]
> Does not currently support `<Outlet />` within a drawer

## Features

- 🔗 **Works with existing React Router** - No special changes needed to your routes or components, just a root layout
- 🚀 **Dual navigation modes** - Same routes work as full pages OR drawer previews
- 📚 **Stackable drawers** - Open multiple drawer layers that peek behind each other
- 🎨 **iOS-style stacking** - Cards peek from behind with configurable spacing and scaling
- 🔗 **URL-based state** - Drawer stack persists in query parameters
- ⚡ **Smooth animations** - Natural enter/exit animations with simultaneous transitions
- 📱 **Multiple dismiss methods** - Close button, background click, or drag-to-dismiss

## Basic Usage

```
npm i drawer-stack
```

### 1. Define your route configuration

Create a standard React Router route configuration:

```tsx
// routeConfig.ts
import { type RouteObject } from "react-router"
import RootLayout from "./layouts/root"
import RootPage from "./routes/root"
import ProfilePage from "./routes/profile"
import SettingsPage from "./routes/settings"

export const routeConfig: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        path: "",
        element: <RootPage />,
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
]
```

### 2. Add DrawerStack to your root layout

The root layout is your top-level route component (typically at path "/"). Add the DrawerStack component here so it can render drawers over your entire app:

```tsx
// routes/root.tsx
import { Outlet } from "react-router"
import { DrawerStack } from 'drawer-stack'
import { routeConfig } from '../routeConfig'

export default function RootLayout() {
  return (
    <>
      {/* Where normal paths will render */}
      <Outlet />

      {/* DrawerStack renders drawers over everything */}
      <DrawerStack routes={routeConfig} />
    </>
  )
}
```

### 3. Use the hook in your components

```tsx
import { useDrawerStack } from 'drawer-stack'
import { Link } from 'react-router'

function MyComponent() {
  const { pushDrawer } = useDrawerStack()

  return (
    <div>
      <button onClick={() => pushDrawer('/profile')}>
        Open Profile (Drawer)
      </button>
      <Link to="/profile">
        Go to Profile (Full Page)
      </Link>
    </div>
  )
}
```

## Configuration

```tsx
<DrawerStack
  routes={routeConfig}
  STACK_GAP={40}        // pixels between cards (default: 40)
  STACK_SQUEEZE={0.04}  // scale reduction per level (default: 0.04)
/>
```

## API

### `useDrawerStack()`

- `pushDrawer(path)` - Add drawer to stack
- `popDrawer()` - Remove top drawer
- `closeAllDrawers()` - Clear entire stack
- `drawerStack` - Current drawer state
- `hasDrawers` - Boolean if any drawers open

For full-page navigation, just use normal React Router `<Link>` components or the `useNavigate()` hook.

### URL Structure

- `?drawer=/profile` - Single drawer
- `?drawer=/profile&drawer=/settings` - Stacked drawers

## How It Works

### Route Integration

The DrawerStack component automatically renders your existing React Router routes inside drawers. Any route in your `routeConfig` can be opened as a drawer without modification.

**Important:** The root route ("/") cannot be displayed in a drawer to prevent infinite recursion.

### Component Reusability

Your route components work identically whether rendered:
- As a full page (normal navigation)
- Inside a drawer (drawer navigation)

No special drawer-aware code needed in your route components!

### Navigation Patterns

```tsx
// Drawer navigation (stacks on top of current page)
pushDrawer('/profile')

// Stack multiple drawers
pushDrawer('/profile')
pushDrawer('/settings') // Opens on top of profile drawer

// Full page navigation (use normal React Router)
<Link to="/profile">Go to Profile</Link>
// or
const navigate = useNavigate()
navigate('/profile')
```

## Tips

- **Performance**: Only open drawers are rendered, so having many routes doesn't impact performance
- **Accessibility**: Drawers include proper focus management and keyboard navigation
- **Mobile-first**: Designed for touch interactions but works great on desktop too
- **URL sharing**: Drawer state is preserved in the URL, so users can bookmark or share stacked states
- **Fill available space**: You can simply use `h-full` to fill available space with your top-level element
