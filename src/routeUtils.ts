import { type RouteObject, matchPath, type PathMatch } from "react-router"

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

// Find a route and its match data by path in a flattened route array
export const findRouteAndMatch = (
  path: string,
  routes: RouteObject[]
): { route: RouteObject; match: PathMatch } | undefined => {
  // Extract just the pathname without query parameters for route matching
  const pathname = path.split("?")[0]

  for (const route of routes) {
    if (!route.path) continue

    // Use end: true to ensure we match the exact path and not a partial parent path.
    const match = matchPath({ path: route.path, end: true }, pathname)
    if (match) {
      return { route, match }
    }
  }
  return undefined
}
