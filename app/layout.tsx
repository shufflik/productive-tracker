import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import { ThemeProvider } from '@/components/theme-provider'
import { PendingDayReviewsManager } from '@/components/pending-day-reviews-manager'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

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
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PendingDayReviewsManager />
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
