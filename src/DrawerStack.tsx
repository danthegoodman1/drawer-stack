import { Drawer } from "vaul"
import { useDrawerStack } from "./useDrawerStack"
import { useEffect, useState, createContext, useContext } from "react"
import { findRouteAndMatch, flattenRoutes } from "./routeUtils"
import {
  type RouteObject,
  UNSAFE_RouteContext as RouteContext,
} from "react-router"

// Context for drawer search parameters
const DrawerSearchParamsContext = createContext<URLSearchParams | null>(null)

// Context to expose the scrollable container element for the drawer content
const DrawerScrollContainerContext = createContext<HTMLDivElement | null>(null)

export const useDrawerScrollContainerRef = () =>
  useContext(DrawerScrollContainerContext)

// Hook to access drawer search parameters
export const useDrawerSearchParams = (): URLSearchParams => {
  const drawerSearchParams = useContext(DrawerSearchParamsContext)
  return drawerSearchParams || new URLSearchParams()
}

interface DrawerStackProps {
  routes: RouteObject[]
  STACK_GAP?: number
  STACK_SQUEEZE?: number
  closeButton?: React.ComponentType<{ onClick: () => void }>
  height?: string
  backgroundColor?: string
  borderRadius?: string
  handleClassName?: string
}

interface DrawerContentProps {
  path: string
  level: number
  onClose: () => void
  onNavigateInDrawer?: (path: string) => void
  routes: RouteObject[]
  closeButton?: React.ComponentType<{ onClick: () => void }>
  borderRadius?: string
}

// This component renders route components inside drawers
function DrawerContent({
  path,
  // level,
  onClose,
  // onNavigateInDrawer,
  routes,
  closeButton: CloseButton,
  borderRadius,
}: DrawerContentProps) {
  const [scrollContainerEl, setScrollContainerEl] =
    useState<HTMLDivElement | null>(null)
  // Ignore root route to prevent recursive rendering
  if (path === "/") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4">
          <div className="flex-1 text-center">
            <h1 className="font-medium">Root Route</h1>
          </div>
          {CloseButton && <CloseButton onClick={onClose} />}
        </div>
        <div className="flex-1 overflow-auto p-4">
          <p>The root route cannot be displayed in a drawer.</p>
          <p className="text-sm text-gray-600 mt-2">
            Try opening other routes instead.
          </p>
        </div>
      </div>
    )
  }

  const flatRoutes = flattenRoutes(routes)
  const result = findRouteAndMatch(path, flatRoutes)

  if (!result || !result.route.element) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4">
          <div className="flex-1 text-center">
            <h1 className="font-medium">Not Found</h1>
          </div>
          {CloseButton && <CloseButton onClick={onClose} />}
        </div>
        <div className="flex-1 overflow-auto p-4">
          <p>No route found for path: {path}</p>
        </div>
      </div>
    )
  }

  const { route, match } = result

  // Parse search parameters from the drawer path
  const [, drawerSearch] = path.split("?")
  const drawerSearchParams = new URLSearchParams(drawerSearch || "")

  const routeContextValue = {
    outlet: null,
    matches: [
      {
        params: match.params,
        pathname: match.pathname,
        pathnameBase: match.pathname,
        route: route,
      },
    ],
    isDataRoute: false,
  }

  return (
    <div className="flex flex-col h-full flex-1 min-h-0 relative">
      {CloseButton && <CloseButton onClick={onClose} />}

      {/* Route Content */}
      <div
        className="overflow-x-auto overflow-y-auto flex-1"
        style={{
          borderTopLeftRadius: borderRadius,
          borderTopRightRadius: borderRadius,
        }}
        ref={setScrollContainerEl}
      >
        <DrawerSearchParamsContext.Provider value={drawerSearchParams}>
          <DrawerScrollContainerContext.Provider value={scrollContainerEl}>
            <RouteContext.Provider value={routeContextValue}>
              {route.element}
            </RouteContext.Provider>
          </DrawerScrollContainerContext.Provider>
        </DrawerSearchParamsContext.Provider>
      </div>
    </div>
  )
}

export function DrawerStack({
  routes,
  STACK_GAP = 40,
  STACK_SQUEEZE = 0.04,
  closeButton,
  height = "85%",
  backgroundColor = "white",
  borderRadius = "10px",
  handleClassName,
}: DrawerStackProps) {
  const { drawerStack, hasDrawers, popDrawer, closeAllDrawers, pushDrawer } =
    useDrawerStack()
  const [openDrawers, setOpenDrawers] = useState<boolean[]>([])
  const [closingDrawers, setClosingDrawers] = useState<Set<number>>(new Set())
  const [draggingDrawers, setDraggingDrawers] = useState<Set<number>>(new Set())

  // Sync open state with drawer stack
  useEffect(() => {
    setOpenDrawers(drawerStack.map(() => true))
  }, [drawerStack.length])

  // Handle drawer close with animation delay
  const handleDrawerClose = (level: number) => {
    // Mark this drawer as closing immediately so other drawers can start moving
    setClosingDrawers((prev) => new Set([...prev, level]))

    // Set the drawer as closed to trigger exit animation
    setOpenDrawers((prev) => {
      const newOpen = [...prev]
      newOpen[level] = false
      return newOpen
    })

    // Remove from URL after animation completes
    setTimeout(() => {
      if (level === drawerStack.length - 1) {
        // Closing the top drawer
        popDrawer()
      } else {
        // Closing a drawer in the middle - close all above it
        closeAllDrawers()
      }

      // Clean up closing state after URL update to prevent position jiggle
      setTimeout(() => {
        setClosingDrawers((prev) => {
          const newSet = new Set(prev)
          newSet.delete(level)
          return newSet
        })
      }, 50)
    }, 300)
  }

  // Handle navigation within drawers
  const handleNavigateInDrawer = (path: string) => {
    pushDrawer(path)
  }

  if (!hasDrawers) {
    return null
  }

  return (
    <>
      {drawerStack.map((drawer, index) => {
        const isClosing = closingDrawers.has(index)
        const isDragging = draggingDrawers.has(index)

        // Calculate effective stack excluding closing drawers
        const effectiveStack = drawerStack.filter(
          (_, i) => !closingDrawers.has(i)
        )
        const effectiveIndex = effectiveStack.findIndex(
          (d) => d.id === drawer.id
        )

        const zIndex = 50 + index // Ensure proper stacking

        return (
          <Drawer.Root
            key={drawer.id}
            open={openDrawers[index] || false}
            onOpenChange={(open) => {
              if (!open) {
                handleDrawerClose(index)
              }
            }}
            handleOnly={true}
            onDrag={() => {
              // event, percentageDragged
              // Mark as dragging when drag starts
              setDraggingDrawers((prev) => new Set([...prev, index]))
            }}
            onRelease={() => {
              // event, open
              // Remove from dragging state when released
              setDraggingDrawers((prev) => {
                const newSet = new Set(prev)
                newSet.delete(index)
                return newSet
              })
            }}
          >
            <Drawer.Portal>
              <Drawer.Overlay
                className="fixed inset-0 bg-black/40"
                style={{ zIndex: zIndex }}
              />
              <Drawer.Content
                className="flex flex-col mt-24 fixed bottom-0 left-0 right-0"
                style={{
                  borderTopRightRadius: borderRadius,
                  borderTopLeftRadius: borderRadius,
                  backgroundColor: backgroundColor,
                  height: height,
                  zIndex: zIndex + 1,
                  // Remove focus ring
                  outline: "none",
                  // If closing or dragging, don't apply any custom transforms - let Vaul handle it
                  transform:
                    isClosing || isDragging
                      ? "none"
                      : `translateY(${
                          (effectiveStack.length - 1 - effectiveIndex) *
                          -STACK_GAP
                        }px) scale(${
                          1 -
                          (effectiveStack.length - 1 - effectiveIndex) *
                            STACK_SQUEEZE
                        })`,
                  // Only apply transition when not closing or dragging
                  transition:
                    isClosing || isDragging
                      ? "none"
                      : "transform 300ms ease-out",
                }}
              >
                {/* "!w-12 !h-1.5 !bg-gray-400 mt-3" */}
                {handleClassName && (
                  <Drawer.Handle className={handleClassName} />
                )}
                {/* let this area take all remaining height */}
                <div className="flex-1 min-h-0">
                  <DrawerContent
                    path={drawer.path}
                    level={drawer.level}
                    onClose={() => handleDrawerClose(index)}
                    onNavigateInDrawer={handleNavigateInDrawer}
                    routes={routes}
                    closeButton={closeButton}
                    borderRadius={borderRadius}
                  />
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        )
      })}
    </>
  )
}
