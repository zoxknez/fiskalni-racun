/**
 * View Transitions API Wrapper
 *
 * Modern browser API for smooth page transitions
 * Supported in Chrome 111+, Edge 111+
 *
 * Features:
 * - Smooth cross-page transitions
 * - Automatic fallback for unsupported browsers
 * - Custom transition animations
 * - Composable transition effects
 */

/**
 * Check if View Transitions API is supported
 */
export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document
}

/**
 * Perform view transition
 * Falls back to immediate execution if not supported
 */
export async function viewTransition(callback: () => void | Promise<void>): Promise<void> {
  if (!supportsViewTransitions()) {
    await callback()
    return
  }

  const doc = document as any
  if (doc.startViewTransition) {
    const transition = doc.startViewTransition(callback)
    await transition.finished
  } else {
    await callback()
  }
}

/**
 * Navigate with view transition
 * For use with React Router
 */
export async function navigateWithTransition(navigate: () => void): Promise<void> {
  await viewTransition(navigate)
}

/**
 * Update state with view transition
 */
export async function updateWithTransition(updateFn: () => void | Promise<void>): Promise<void> {
  await viewTransition(updateFn)
}

/**
 * Custom view transition types (via CSS)
 */
export function setViewTransitionName(element: HTMLElement, name: string) {
  if (element && element.style) {
    element.style.viewTransitionName = name
  }
}

export function clearViewTransitionName(element: HTMLElement) {
  if (element && element.style) {
    element.style.viewTransitionName = ''
  }
}

/**
 * Prebuilt transition styles
 * Add these to your CSS:
 */

/*
CSS to add to your stylesheet:

::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
}

// Slide transition
::view-transition-old(slide) {
  animation: slide-out 0.3s ease-out;
}

::view-transition-new(slide) {
  animation: slide-in 0.3s ease-out;
}

@keyframes slide-out {
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
}

@keyframes slide-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

// Fade transition
::view-transition-old(fade) {
  animation: fade-out 0.2s ease-out;
}

::view-transition-new(fade) {
  animation: fade-in 0.2s ease-in;
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

// Scale transition
::view-transition-old(scale) {
  animation: scale-out 0.3s ease-out;
}

::view-transition-new(scale) {
  animation: scale-in 0.3s ease-out;
}

@keyframes scale-out {
  from { transform: scale(1); opacity: 1; }
  to { transform: scale(0.8); opacity: 0; }
}

@keyframes scale-in {
  from { transform: scale(1.2); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
*/

// Example usage:
/*
// In React Router navigation
const navigate = useNavigate()

const handleNavigate = async () => {
  await navigateWithTransition(() => {
    navigate('/next-page')
  })
}

// In state updates
const [showModal, setShowModal] = useState(false)

const handleToggleModal = async () => {
  await updateWithTransition(() => {
    setShowModal(!showModal)
  })
}

// With element-specific transitions
const elementRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  if (elementRef.current) {
    setViewTransitionName(elementRef.current, 'hero-image')
  }

  return () => {
    if (elementRef.current) {
      clearViewTransitionName(elementRef.current)
    }
  }
}, [])
*/
