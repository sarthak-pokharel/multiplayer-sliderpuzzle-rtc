/**
 * Sleep for a specified number of milliseconds
 * @param ms Milliseconds to wait
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Detect if the device is mobile/touch based
 */
export const isTouchDevice = (): boolean => {
  return ('ontouchstart' in window) || 
    (navigator.maxTouchPoints > 0) || 
    ((navigator as any).msMaxTouchPoints > 0)
}

/**
 * Format time in MM:SS format
 * @param seconds Total seconds
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Generate a random integer between min and max (inclusive)
 */
export const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Check if the browser supports fullscreen mode
 */
export const supportsFullscreen = (): boolean => {
  return document.documentElement.requestFullscreen !== undefined
}

/**
 * Debounce a function call
 * @param func Function to debounce
 * @param wait Wait time in ms
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number | null = null
  
  return (...args: Parameters<T>): void => {
    if (timeout) window.clearTimeout(timeout)
    
    timeout = window.setTimeout(() => {
      func(...args)
    }, wait)
  }
} 