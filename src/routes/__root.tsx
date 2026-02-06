import { HeadContent, Scripts, createRootRoute, useRouter, useLocation, Outlet, redirect } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useEffect, useState } from 'react'

import Header from '../components/Header'

import appCss from '../styles.css?url'

// Routes that don't require authentication
const publicRoutes = ['/signin', '/']

// Routes that should not show the header (unauthenticated landing experience)
const noHeaderRoutes = ['/signin', '/']

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Liwanag - Dark Funnel Intelligence',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  component: RootComponent,

  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h1>
        <pre className="bg-slate-100 p-4 rounded text-sm overflow-auto">
          {error.message}
        </pre>
      </div>
    </div>
  ),

  notFoundComponent: () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">404</h1>
        <p className="text-lg text-slate-600 mb-6">Page not found</p>
        <a href="/" className="text-cyan-600 hover:text-cyan-700 font-medium">
          Go back home
        </a>
      </div>
    </div>
  ),

  shellComponent: RootDocument,
})

function RootComponent() {
  const location = useLocation()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  const pathname = location.pathname
  const showHeader = !noHeaderRoutes.includes(pathname)
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/api/')

  useEffect(() => {
    // Check authentication on protected routes
    if (!isPublicRoute) {
      const user = localStorage.getItem('liwanag_user')
      if (!user) {
        router.navigate({ to: '/signin' })
        return
      }
    }
    setIsChecking(false)
  }, [pathname, isPublicRoute])

  // Show loading while checking auth
  if (isChecking && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a3e] to-[#2d1b4e] flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <>
      {showHeader && <Header />}
      <Outlet />
    </>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
