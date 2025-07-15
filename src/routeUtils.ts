import { type RouteObject, matchPath } from "react-router"

// Flatten nested routes for easier matching in drawers
export const flattenRoutes = (
  routes: RouteObject[],
  parentPath = ""
): RouteObject[] => {
  const flattened: RouteObject[] = []

  routes.forEach((route) => {
    const fullPath = route.path
      ? parentPath === "/"
        ? route.path === "/"
          ? "/"
          : `/${route.path}`
        : `${parentPath}/${route.path}`.replace(/\/+/g, "/")
      : parentPath

    // Add the route itself
    flattened.push({
      ...route,
      path: fullPath,
    })

    // Add children recursively
    if (route.children) {
      flattened.push(...flattenRoutes(route.children, fullPath))
    }
  })

  return flattened
}

// Find a route by path in a flattened route array
export const findRouteByPath = (
  path: string,
  routes: RouteObject[]
): RouteObject | undefined => {
  return routes.find((route) => {
    if (!route.path) return false

    // Exact match
    if (route.path === path) return true

    // Try matching with React Router's matching logic
    const match = matchPath({ path: route.path }, path)
    return match !== null
  })
}
