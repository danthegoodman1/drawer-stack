import { useNavigate, useSearchParams, useLocation } from "react-router"
import { useCallback, useMemo } from "react"

export interface DrawerStackItem {
  id: string
  path: string
  title?: string
  level: number
}

export function useDrawerStack() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  // Parse drawer stack from URL
  const drawerStack = useMemo(() => {
    const drawerParams = searchParams.getAll("drawer")
    return drawerParams.map((path, index) => ({
      id: `drawer-${index}`,
      path,
      level: index,
    }))
  }, [searchParams])

  // Check if any drawers are open
  const hasDrawers = drawerStack.length > 0

  // Get current (top) drawer
  const currentDrawer = drawerStack[drawerStack.length - 1] || null

  // Push a new drawer onto the stack
  const pushDrawer = useCallback(
    (path: string) => {
      // , title?: string
      // Always read current URL state to ensure proper stacking
      const currentSearchParams = new URLSearchParams(window.location.search)
      currentSearchParams.append("drawer", path)

      navigate(
        {
          pathname: location.pathname,
          search: currentSearchParams.toString(),
        },
        { replace: false }
      )
    },
    [navigate, location.pathname]
  )

  // Pop the top drawer from the stack
  const popDrawer = useCallback(() => {
    const drawerParams = searchParams.getAll("drawer")
    if (drawerParams.length === 0) return

    const newSearchParams = new URLSearchParams(searchParams)
    // Remove all drawer params and re-add all but the last one
    newSearchParams.delete("drawer")
    drawerParams.slice(0, -1).forEach((path) => {
      newSearchParams.append("drawer", path)
    })

    navigate(
      {
        pathname: location.pathname,
        search: newSearchParams.toString(),
      },
      { replace: false }
    )
  }, [searchParams, navigate, location.pathname])

  // Close all drawers
  const closeAllDrawers = useCallback(() => {
    const newSearchParams = new URLSearchParams(searchParams)
    newSearchParams.delete("drawer")

    navigate(
      {
        pathname: location.pathname,
        search: newSearchParams.toString(),
      },
      { replace: false }
    )
  }, [searchParams, navigate, location.pathname])

  // Replace the current top drawer with a new path
  const replaceDrawer = useCallback(
    (path: string) => {
      const drawerParams = searchParams.getAll("drawer")
      const newSearchParams = new URLSearchParams(searchParams)

      // Remove all drawer params
      newSearchParams.delete("drawer")

      if (drawerParams.length === 0) {
        // No drawers exist, just add the new one
        newSearchParams.append("drawer", path)
      } else {
        // Replace the top drawer: keep all but the last, then add the new path
        drawerParams.slice(0, -1).forEach((drawerPath) => {
          newSearchParams.append("drawer", drawerPath)
        })
        newSearchParams.append("drawer", path)
      }

      navigate(
        {
          pathname: location.pathname,
          search: newSearchParams.toString(),
        },
        { replace: false }
      )
    },
    [searchParams, navigate, location.pathname]
  )

  // Replace the entire drawer stack
  const replaceDrawerStack = useCallback(
    (paths: string[]) => {
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.delete("drawer")
      paths.forEach((path) => {
        newSearchParams.append("drawer", path)
      })

      navigate(
        {
          pathname: location.pathname,
          search: newSearchParams.toString(),
        },
        { replace: false }
      )
    },
    [searchParams, navigate, location.pathname]
  )

  return {
    drawerStack,
    hasDrawers,
    currentDrawer,
    pushDrawer,
    popDrawer,
    replaceDrawer,
    closeAllDrawers,
    replaceDrawerStack,
  }
}
