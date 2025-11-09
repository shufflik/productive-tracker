"use client"

import { useState, useEffect, useCallback } from "react"
import { z } from "zod"

type UseLocalStorageOptions<T> = {
  key: string
  initialValue: T
  schema?: z.ZodSchema<T>
}

/**
 * Custom hook for localStorage with type-safety and validation
 * Handles SSR, JSON parsing errors, and validation errors
 */
export function useLocalStorage<T>({
  key,
  initialValue,
  schema,
}: UseLocalStorageOptions<T>): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const [isClient, setIsClient] = useState(false)

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load initial value from localStorage
  useEffect(() => {
    if (!isClient) return

    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        const parsed = JSON.parse(item)
        
        // Validate with schema if provided
        if (schema) {
          const result = schema.safeParse(parsed)
          if (result.success) {
            setStoredValue(result.data)
          } else {
            console.error(`Validation error for key "${key}":`, result.error)
            setStoredValue(initialValue)
          }
        } else {
          setStoredValue(parsed)
        }
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      setStoredValue(initialValue)
    }
  }, [isClient, key, initialValue, schema])

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      if (!isClient) return

      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value

        // Validate before storing
        if (schema) {
          const result = schema.safeParse(valueToStore)
          if (!result.success) {
            console.error(`Validation error when setting key "${key}":`, result.error)
            return
          }
        }

        // Save state
        setStoredValue(valueToStore)

        // Save to localStorage
        window.localStorage.setItem(key, JSON.stringify(valueToStore))

        // Dispatch custom event for cross-tab synchronization
        window.dispatchEvent(
          new CustomEvent("local-storage", {
            detail: { key, value: valueToStore },
          })
        )
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error)
      }
    },
    [isClient, key, storedValue, schema]
  )

  // Function to remove the value from localStorage
  const removeValue = useCallback(() => {
    if (!isClient) return

    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
      
      window.dispatchEvent(
        new CustomEvent("local-storage", {
          detail: { key, value: null },
        })
      )
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error)
    }
  }, [isClient, key, initialValue])

  // Listen for changes in other tabs/windows
  useEffect(() => {
    if (!isClient) return

    const handleStorageChange = (e: StorageEvent | CustomEvent) => {
      if (e instanceof StorageEvent) {
        if (e.key === key && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue)
            if (schema) {
              const result = schema.safeParse(parsed)
              if (result.success) {
                setStoredValue(result.data)
              }
            } else {
              setStoredValue(parsed)
            }
          } catch (error) {
            console.error(`Error parsing storage event for key "${key}":`, error)
          }
        }
      } else {
        // Custom event for same-tab updates
        const detail = (e as CustomEvent).detail
        if (detail.key === key) {
          setStoredValue(detail.value ?? initialValue)
        }
      }
    }

    window.addEventListener("storage", handleStorageChange as EventListener)
    window.addEventListener("local-storage", handleStorageChange as EventListener)

    return () => {
      window.removeEventListener("storage", handleStorageChange as EventListener)
      window.removeEventListener("local-storage", handleStorageChange as EventListener)
    }
  }, [isClient, key, initialValue, schema])

  return [storedValue, setValue, removeValue]
}

