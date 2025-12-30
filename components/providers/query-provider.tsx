"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

type QueryProviderProps = {
  children: React.ReactNode
}

// Singleton queryClient for use outside of React components
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 60 * 1000, // 1 hour
      gcTime: 60 * 60 * 1000, // 1 hour
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
