import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { registerBrowserTestDriver } from "./features/browser/test-driver";
import { registerDesktopTestDriver } from "./features/desktop/test-driver";
import "./app.css";

registerBrowserTestDriver();
registerDesktopTestDriver();

export const links: Route.LinksFunction = () => [
  {
    rel: "preload",
    href: "/fonts/inter-400.ttf",
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: "/fonts/inter-500.ttf",
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: "/fonts/outfit-200.ttf",
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: "/fonts/outfit-300.ttf",
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: "/fonts/outfit-400.ttf",
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: "/fonts/outfit-600.ttf",
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-black/30 p-8 shadow-2xl shadow-black/20 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold/70">
          Ascension Shell
        </p>
        <h1 className="mt-4 font-display text-4xl text-silver-bright">{message}</h1>
        <p className="mt-3 text-base text-silver">{details}</p>
      </div>
      {stack && (
        <pre className="mt-6 w-full max-w-2xl overflow-x-auto rounded-[1.5rem] border border-white/10 bg-stone-950/80 p-4 text-sm text-stone-200">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
