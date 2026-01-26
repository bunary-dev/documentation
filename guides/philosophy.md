
# Philosophy

The guiding principles behind Bunary's design decisions.

## Bun-First, Not Node-First

Bunary is designed specifically for the Bun runtime. We don't try to maintain Node.js compatibility at the expense of leveraging Bun's unique capabilities. This means we can take full advantage of Bun's native TypeScript support, built-in test runner, fast startup times, and optimized APIs.

## Opinionated, Not Configurable by Default

Rather than offering endless configuration options, Bunary makes sensible choices for you. Convention over configuration means you spend less time setting up and more time building. When you do need to customize, the options are there — but the defaults are designed to work for most use cases.

## Explicit APIs Over Magic

There's no hidden behavior in Bunary. Every action is explicit and traceable. You won't find yourself debugging mysterious framework internals. When something happens, you can see exactly why and where it was triggered.

## Runtime Clarity Over Decorators

While decorators can be elegant, they often obscure what's actually happening at runtime. Bunary prefers plain functions and explicit configuration that's easy to understand, test, and debug. Your IDE's "Go to Definition" should always lead somewhere meaningful.

## Developer Experience Before Ecosystem

We prioritize a delightful developer experience over building a massive plugin ecosystem. The core functionality should be excellent, well-documented, and a joy to use. A smaller, focused feature set that works beautifully is better than a sprawling ecosystem of half-finished integrations.

## What Bunary Is Not

- **A full Laravel replacement** — we're inspired by Laravel, not cloning it
- **A full ORM** — we focus on API primitives, not database abstraction
- **A NestJS alternative** — we avoid decorators and DI containers
- **A hosting platform** — Bunary is a framework, deploy it anywhere
