/**
 * Global error handler to suppress message-passing errors from extensions
 * These are benign errors that don't affect the app's functionality
 */

export function initializeErrorHandler() {
  // Suppress "message channel closed" errors from browser extensions
  window.addEventListener('error', (event) => {
    const message = event.message || event.filename || ''
    if (
      message.includes('message channel closed') ||
      message.includes('A listener indicated an asynchronous response')
    ) {
      event.preventDefault()
      // Silently suppress - these are extension errors
      return true
    }
  })

  // Handle unhandled promise rejections from extensions
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason || ''
    const reasonString = typeof reason === 'string' ? reason : reason?.toString?.() || ''
    
    if (
      reasonString.includes('message channel closed') ||
      reasonString.includes('A listener indicated an asynchronous response')
    ) {
      event.preventDefault()
      // Silently suppress - these are extension errors
    }
  })

  // Suppress chrome.runtime.lastError messages from browser extensions
  // This handles "Unchecked runtime.lastError" warnings
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    const originalError = Object.getOwnPropertyDescriptor(
      chrome.runtime,
      'lastError'
    )

    Object.defineProperty(chrome.runtime, 'lastError', {
      get() {
        return originalError?.get?.() || null
      },
      set() {
        // Do nothing - suppress the error
      },
      configurable: true,
    })

    // Override console.error to suppress runtime.lastError messages
    const originalConsoleError = console.error
    console.error = function (...args: any[]) {
      const message = args.join(' ')
      if (
        message.includes('Unchecked runtime.lastError') ||
        message.includes('A listener indicated an asynchronous response') ||
        message.includes('message channel closed')
      ) {
        // Silently suppress these extension errors
        return
      }
      originalConsoleError.apply(console, args)
    }

    // Override console.warn to suppress extension warnings
    const originalConsoleWarn = console.warn
    console.warn = function (...args: any[]) {
      const message = args.join(' ')
      if (
        message.includes('message channel closed') ||
        message.includes('A listener indicated an asynchronous response')
      ) {
        // Silently suppress these extension errors
        return
      }
      originalConsoleWarn.apply(console, args)
    }
  }
}
