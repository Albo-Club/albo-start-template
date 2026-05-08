import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import { AppShell } from '~/components/AppShell';
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary';
import { NotFound } from '~/components/NotFound';
import { Providers } from '~/components/Providers';
import { seo } from '~/lib/seo';
import appCss from '~/styles/app.css?url';

const convexPreconnect = import.meta.env.VITE_CONVEX_URL || undefined;

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
      ...seo({
        title: 'TanStack Start Template',
        description:
          'TanStack Start template built with Better Auth, Convex, Tailwind CSS, Shadcn/UI, Resend, and deployed to Netlify',
      }),
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      // Google Fonts — loaded here (not via CSS @import) for parallel preconnect
      // and to avoid the PostCSS "@import must precede all other statements"
      // violation that fires when albo-brand.css is itself @imported.
      // See KNOWN_ISSUES.md #10.
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' as const },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
      { rel: 'manifest', href: '/site.webmanifest', color: '#fffff' },
      { rel: 'icon', href: '/favicon.ico' },
      ...(convexPreconnect
        ? [{ rel: 'preconnect', href: convexPreconnect, crossOrigin: 'anonymous' as const }]
        : []),
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  component: RootDocument,
});

// Root document component that renders the full HTML structure
function RootDocument() {
  return (
    <html
      lang="en"
      // Suppress hydration warnings for theme-related attributes
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <body>
        <Providers>
          <AppShell />
        </Providers>
        <Scripts />
      </body>
    </html>
  );
}
