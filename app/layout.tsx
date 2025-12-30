import type { Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import { ThemeProvider } from '@/components/theme-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { PendingDayReviewsManager } from '@/components/pending-day-reviews-manager'
import { ConflictsManager } from '@/components/conflicts-manager'
import { Toaster } from 'sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

// Disable zoom on input focus for Telegram WebApp
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            <PendingDayReviewsManager />
            <ConflictsManager />
            {children}
            <Toaster
              position="bottom-center"
              toastOptions={{
                style: {
                  background: '#dc2626',
                  color: '#fff'
                },
                className: 'sonner-toast',
              }}
            />
          </QueryProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
