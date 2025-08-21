import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

interface CustomVerticalDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  handleOnly?: boolean
  onDrag?: (event: TouchEvent | MouseEvent, percentageDragged: number) => void
  onRelease?: (event: TouchEvent | MouseEvent, open: boolean) => void
}

interface DrawerRootProps extends CustomVerticalDrawerProps {}

interface DrawerPortalProps {
  children: ReactNode
}

interface DrawerOverlayProps {
  className?: string
  style?: React.CSSProperties
}

interface DrawerContentProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  onPointerDownOutside?: (event: PointerEvent) => void
  onInteractOutside?: (event: PointerEvent) => void
}

interface DrawerHandleProps {
  className?: string
}

// Context to pass drawer state down to child components
const DrawerContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
  handleOnly?: boolean
  onDrag?: (event: TouchEvent | MouseEvent, percentageDragged: number) => void
  onRelease?: (event: TouchEvent | MouseEvent, open: boolean) => void
  isDragging: boolean
  setIsDragging: (dragging: boolean) => void
  dragOffset: number
  setDragOffset: (offset: number) => void
} | null>(null)

function useDrawerContext() {
  const context = React.useContext(DrawerContext)
  if (!context) {
    throw new Error("Drawer components must be used within Drawer.Root")
  }
  return context
}

// Main drawer root component
function DrawerRoot({ children, ...props }: DrawerRootProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)

  return (
    <DrawerContext.Provider
      value={{
        ...props,
        isDragging,
        setIsDragging,
        dragOffset,
        setDragOffset,
      }}
    >
      {children}
    </DrawerContext.Provider>
  )
}

// Portal wrapper for rendering drawer outside DOM hierarchy
function DrawerPortal({ children }: DrawerPortalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(children, document.body)
}

// Overlay component (background)
function DrawerOverlay({ className, style }: DrawerOverlayProps) {
  const { open } = useDrawerContext()

  return (
    <div
      className={`${className} ${
        open ? "opacity-100" : "opacity-0"
      } ${!open ? "pointer-events-none" : ""}`}
      style={{
        ...style,
        transition: "opacity 250ms cubic-bezier(0.68, 0, 0.265, 1)",
      }}
      data-drawer-overlay="true"
    />
  )
}

// Main content container with drag support
function DrawerContent({
  children,
  className,
  style,
  onPointerDownOutside,
  onInteractOutside,
}: DrawerContentProps) {
  const {
    open,
    onOpenChange,
    handleOnly,
    onDrag,
    onRelease,
    isDragging,
    setIsDragging,
    dragOffset,
    setDragOffset,
  } = useDrawerContext()

  const contentRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const dragStartY = useRef<number | null>(null)
  const initialHeight = useRef<number>(0)
  const lastEventRef = useRef<TouchEvent | MouseEvent | null>(null)

  // Always render the drawer (just positioned offscreen when closed)
  // This allows smooth animations controlled by the parent
  useEffect(() => {
    setIsVisible(true)
    if (!open) {
      setDragOffset(0)
    }
  }, [open, setDragOffset])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [open])

  // Handle drag start
  const handleDragStart = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      if (handleOnly) return // Only allow dragging from handle if handleOnly is true

      const nativeEvent = event.nativeEvent
      const clientY =
        "touches" in nativeEvent
          ? nativeEvent.touches[0].clientY
          : (nativeEvent as MouseEvent).clientY
      dragStartY.current = clientY

      if (contentRef.current) {
        initialHeight.current = contentRef.current.offsetHeight
      }

      setIsDragging(true)
      lastEventRef.current = nativeEvent

      if (onDrag) {
        onDrag(nativeEvent, 0)
      }

      event.preventDefault()
    },
    [handleOnly, setIsDragging, onDrag]
  )

  // Handle drag move
  const handleDragMove = useCallback(
    (event: TouchEvent | MouseEvent) => {
      if (!isDragging || dragStartY.current === null) return

      const clientY =
        "touches" in event ? event.touches[0].clientY : event.clientY
      const deltaY = clientY - dragStartY.current

      // Only allow dragging down (positive deltaY)
      const clampedDelta = Math.max(0, deltaY)
      setDragOffset(clampedDelta)

      lastEventRef.current = event

      if (onDrag && initialHeight.current > 0) {
        const percentageDragged = clampedDelta / initialHeight.current
        onDrag(event, percentageDragged)
      }

      event.preventDefault()
    },
    [isDragging, setDragOffset, onDrag]
  )

  // Handle drag end
  const handleDragEnd = useCallback(
    (event?: TouchEvent | MouseEvent) => {
      if (!isDragging) return

      const finalEvent = event || lastEventRef.current
      const threshold = initialHeight.current * 0.3 // Close if dragged more than 30% of height
      const shouldClose = dragOffset > threshold

      setIsDragging(false)
      dragStartY.current = null
      lastEventRef.current = null

      if (shouldClose) {
        onOpenChange(false)
      } else {
        // Animate back to original position
        setDragOffset(0)
      }

      if (onRelease && finalEvent) {
        onRelease(finalEvent, !shouldClose)
      }
    },
    [
      isDragging,
      dragOffset,
      setIsDragging,
      setDragOffset,
      onOpenChange,
      onRelease,
    ]
  )

  // Set up global drag listeners
  useEffect(() => {
    if (!isDragging) return

    const handleGlobalMove = (e: TouchEvent | MouseEvent) => handleDragMove(e)
    const handleGlobalEnd = (e?: TouchEvent | MouseEvent) => handleDragEnd(e)

    // Add both mouse and touch listeners
    document.addEventListener("mousemove", handleGlobalMove)
    document.addEventListener("mouseup", handleGlobalEnd)
    document.addEventListener("touchmove", handleGlobalMove, { passive: false })
    document.addEventListener("touchend", handleGlobalEnd)

    return () => {
      document.removeEventListener("mousemove", handleGlobalMove)
      document.removeEventListener("mouseup", handleGlobalEnd)
      document.removeEventListener("touchmove", handleGlobalMove)
      document.removeEventListener("touchend", handleGlobalEnd)
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  // Handle click outside
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!open || !contentRef.current) return

      const target = event.target as Element

      // Check if the click is on another drawer's content
      const allDrawerContents = document.querySelectorAll(
        '[data-drawer-content="true"]'
      )

      let clickedOnAnotherDrawer = false
      allDrawerContents.forEach((drawer) => {
        if (drawer !== contentRef.current && drawer.contains(target)) {
          clickedOnAnotherDrawer = true
        }
      })

      if (clickedOnAnotherDrawer) {
        return
      }

      // Check if this is an overlay click (any overlay means we're clicking outside)
      const isOverlayClick = target.hasAttribute("data-drawer-overlay")

      if (!contentRef.current.contains(target) || isOverlayClick) {
        // First call the callbacks to allow parent to handle it
        if (onPointerDownOutside) {
          onPointerDownOutside(event)
        }
        if (onInteractOutside) {
          onInteractOutside(event)
        }

        // Check if we should prevent close (e.g., for toast interactions)
        const toastContainer = document.querySelector(
          "[data-toast-container]"
        ) as HTMLElement | null
        if (toastContainer && toastContainer.contains(target)) {
          return // Don't close if clicking on toast
        }

        // Only close if parent didn't prevent it
        if (!event.defaultPrevented) {
          onOpenChange(false)
        }
      }
    }

    if (open) {
      // Small delay to avoid immediate close on open
      const timeout = setTimeout(() => {
        document.addEventListener("pointerdown", handlePointerDown)
      }, 100)

      return () => {
        clearTimeout(timeout)
        document.removeEventListener("pointerdown", handlePointerDown)
      }
    }
  }, [open, onOpenChange, onPointerDownOutside, onInteractOutside])

  if (!isVisible) return null

  // The parent (DrawerStack) handles all positioning and animations
  // We just need to handle drag offset
  const computedStyle = {
    ...style,
    transform:
      isDragging && dragOffset > 0
        ? `${style?.transform || ""} translateY(${dragOffset}px)`
        : style?.transform,
  }

  return (
    <div
      ref={contentRef}
      className={className}
      style={computedStyle}
      data-drawer-content="true"
      onMouseDown={!handleOnly ? handleDragStart : undefined}
      onTouchStart={!handleOnly ? handleDragStart : undefined}
    >
      {children}
    </div>
  )
}

// Handle component for dragging
function DrawerHandle({ className }: DrawerHandleProps) {
  const { handleOnly, onDrag, onRelease, setIsDragging, setDragOffset } =
    useDrawerContext()

  const handleRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef<number | null>(null)
  const parentHeight = useRef<number>(0)
  const lastEventRef = useRef<TouchEvent | MouseEvent | null>(null)

  const handleDragStart = useCallback(
    (event: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent) => {
      // Handle both React and native events
      const nativeEvent = "nativeEvent" in event ? event.nativeEvent : event
      const clientY =
        "touches" in nativeEvent
          ? nativeEvent.touches[0].clientY
          : (nativeEvent as MouseEvent).clientY
      dragStartY.current = clientY

      // Get parent content height
      const contentEl = handleRef.current?.closest('[class*="flex flex-col"]')
      if (contentEl) {
        parentHeight.current = contentEl.getBoundingClientRect().height
      }

      setIsDragging(true)
      lastEventRef.current = nativeEvent

      if (onDrag) {
        onDrag(nativeEvent, 0)
      }

      event.preventDefault()
      if ("stopPropagation" in event) {
        event.stopPropagation()
      }
    },
    [setIsDragging, onDrag]
  )

  const handleDragMove = useCallback(
    (event: TouchEvent | MouseEvent) => {
      if (dragStartY.current === null) return

      const clientY =
        "touches" in event ? event.touches[0].clientY : event.clientY
      const deltaY = clientY - dragStartY.current

      // Only allow dragging down (positive deltaY)
      const clampedDelta = Math.max(0, deltaY)
      setDragOffset(clampedDelta)

      lastEventRef.current = event

      if (onDrag && parentHeight.current > 0) {
        const percentageDragged = clampedDelta / parentHeight.current
        onDrag(event, percentageDragged)
      }

      event.preventDefault()
    },
    [setDragOffset, onDrag]
  )

  const handleDragEnd = useCallback(
    (event?: TouchEvent | MouseEvent) => {
      const finalEvent = event || lastEventRef.current

      setIsDragging(false)
      dragStartY.current = null
      lastEventRef.current = null

      // Let the content component handle the actual close logic

      if (onRelease && finalEvent) {
        onRelease(finalEvent, true)
      }
    },
    [setIsDragging, onRelease]
  )

  // Set up drag listeners when handleOnly is true
  useEffect(() => {
    if (!handleOnly) return

    const handle = handleRef.current
    if (!handle) return

    const onStart = (e: TouchEvent | MouseEvent) => handleDragStart(e)

    handle.addEventListener("mousedown", onStart)
    handle.addEventListener("touchstart", onStart, { passive: false })

    return () => {
      handle.removeEventListener("mousedown", onStart)
      handle.removeEventListener("touchstart", onStart)
    }
  }, [handleOnly, handleDragStart])

  // Global move and end listeners when dragging
  const { isDragging } = useDrawerContext()
  useEffect(() => {
    if (!isDragging || !handleOnly) return

    const handleGlobalMove = (e: TouchEvent | MouseEvent) => handleDragMove(e)
    const handleGlobalEnd = (e?: TouchEvent | MouseEvent) => handleDragEnd(e)

    document.addEventListener("mousemove", handleGlobalMove)
    document.addEventListener("mouseup", handleGlobalEnd)
    document.addEventListener("touchmove", handleGlobalMove, { passive: false })
    document.addEventListener("touchend", handleGlobalEnd)

    return () => {
      document.removeEventListener("mousemove", handleGlobalMove)
      document.removeEventListener("mouseup", handleGlobalEnd)
      document.removeEventListener("touchmove", handleGlobalMove)
      document.removeEventListener("touchend", handleGlobalEnd)
    }
  }, [isDragging, handleOnly, handleDragMove, handleDragEnd])

  return (
    <div
      ref={handleRef}
      className={
        className ||
        "w-12 h-1.5 bg-gray-400 rounded-full mx-auto my-3 cursor-grab active:cursor-grabbing"
      }
    />
  )
}

// Export as namespace similar to Vaul
export const Drawer = {
  Root: DrawerRoot,
  Portal: DrawerPortal,
  Overlay: DrawerOverlay,
  Content: DrawerContent,
  Handle: DrawerHandle,
}

// Also export individual components for direct import if needed
export { DrawerRoot, DrawerPortal, DrawerOverlay, DrawerContent, DrawerHandle }
