---
name: clone-website
description: Rebuild existing web pages as working local code, matching their real content, assets, responsive layout, and interactions. Use for website cloning, replication, or reverse engineering, including Framer sites and animated pages.
---

# Clone a website

Recreate the supplied pages in the current app. Match the source before adding a new design direction. Deliver working, editable code: screenshots, iframes, and downloaded production bundles are references, not the implementation.

## 本模板的 Hono 实现约定

This template is server-rendered Bun + Hono with htmx, Alpine, Basecoat and Tailwind v4. Do not introduce React, Hono JSX, or a client-side framework. Build HTML with `src/shared/html.ts`; normal interpolation escapes automatically, and only controlled markup may use `raw()`.

- Route ownership: `src/sites/<site>/routes.ts`, `pages/`, `fragments/`, and `components/`; global helpers stay in `src/shared/`.
- Full pages must call `renderPage()` with an explicit cache choice. Never hand-assemble a second `<html>` document.
- **HTML fragment**: htmx endpoints return only the changed markup, with the correct status code. Never return a full page from a fragment route.
- **assetUrl**: every local `/static/` and `/sites/` URL goes through `assetUrl()`. After adding or replacing an asset, run `bun run build` and commit both generated artifacts.
- **Alpine** owns small local UI state; htmx owns server round-trips. Do not duplicate the same interaction in both.
- Site CSS belongs in `src/styles/sites/<site>.css`; extracted assets belong in `public/sites/<site>/`.

### 交互分类

Classify each observed interaction before implementing it:

| 交互分类 | 实现方式 |
| --- | --- |
| Navigation, form submit, filtering, pagination, partial refresh | htmx request returning an HTML fragment |
| Menu, tab, dialog, disclosure, local toggle | Alpine state, with accessible markup |
| Scroll, hover, time, canvas or complex motion | CSS first, or a focused animation library when the source truly needs it |

Preserve what actually drives the change. Never replace scroll-driven behavior with a click imitation.

### 缓存分类

Every route must choose one cache class:

| 缓存分类 | 响应要求 |
| --- | --- |
| Public page | `renderPage()` with `cache: { visibility: 'public' }`; shared caching, `Vary: Accept-Encoding`, no cookie |
| Private page or write | `renderPage()` with private cache, or a fragment route; `no-store`, `Vary: Cookie`, CSRF enforced |
| Real static file | `bun` server or Workers assets add `public, max-age=31536000, immutable` |
| Missing static file | 404; never add immutable |

Add tests for cache headers and cookies whenever a route is added or changed.

## 1. Map the work

Read project instructions, the actual framework/scripts, and existing routes. Open the source URLs with the available browser. Prefer direct HTTP, asset tools, or APIs for extraction when practical; use the browser to establish appearance and behavior.

Record a short source-to-local route map and the files each page owns. Follow the app's conventions; in this template use `src/sites/<site>/`, `public/sites/<site>/`, `docs/research/<site>/`, and `src/shared/` for reusable Hono/HTML helpers. Give origins, pages, and downloads distinct names; add a port or URL hash when readable names collide.

- A first root clone may replace the untouched template homepage.
- Preserve source pathnames for multiple pages from one origin. Query/fragment variations usually represent states of the same route; reproduce those states.
- Preserve existing authored routes/assets. Update them when requested; resolve unrequested route collisions before replacing anything.
- When adding pages to an existing clone, extend its layout and global styles without replacing the styles used by existing pages.
- Use separate apps for different origins unless the user wants a combined app. Combined sites need distinct route prefixes and scoped fonts, styles, and layout.
- Escape literal URL segments that conflict with framework syntax (`_`, `@`, brackets, parentheses) using its supported mechanism, then verify the actual requested URL.

Existing clones are useful starting points: compare them with the current source and record what was reused. Finish when every requested URL has a destination and file ownership is clear.

## 2. Observe before building

Inspect the whole page at desktop and mobile widths. Scroll top to bottom to load lazy media and reveal sticky/pinned scenes. Then exercise menus, tabs, accordions, carousels, hover states, and primary links. Distinguish changes driven by **scroll, click, hover, or time**; a click imitation of a scroll-driven section is a different product.

Treat each observation as one sample of a **rule**. Read declared values (computed styles, CSS variables, a library's live options) rather than inferring them from one rendering, and vary viewport width (including wider than the design), viewport height, input, and state until you know what drives each change. Drive the page with the inputs visitors use (wheel, touch, keyboard, pointer); scripted scrolling bypasses behavior attached to them, such as smooth scrolling.

Save source screenshots labeled with viewport, scroll position, and interaction state. Capture alternate-state content/assets. Keep one compact page brief: section order, typography, layout measurements, asset mapping, and interactions. Add section briefs only when they help independent builders.

Read [the inspection reference](references/inspection-guide.md) for extraction and state comparison. For **Framer-generated pages, sticky scenes, reveal animations, or animated media**, read [Framer and motion](references/framer-and-motion.md).

Use the source's real text and the files it actually loads: fonts, images, SVGs, and video. A same-named substitute from another provider or icon set has different metrics or shapes. Measure important geometry/computed styles. Inspect layered images and media elements before rebuilding a visual as HTML. Track source URL → local asset path and verify content type/dimensions: a `.png` URL may return AVIF.

Finish when every section and meaningful state has enough evidence to build, with unavailable details identified. A large DOM dump does not replace looking at the page.

## 3. Build a complete first pass

Establish fonts, page width, colors, assets, routes, page-wide behavior, and shared components first. Build each shared component with every observed state (hover, focus, breakpoints) so builders reuse it as-is. Reuse fitting components. Prefer CSS for layout/simple motion and an animation library when source behavior needs it.

Build coherent sections with real content. Delegate independent pages/sections after shared files have an owner. Give builders screenshots, relevant measurements/state notes, asset paths, destination files, and a concrete finish line. A concise brief with precise file references is enough; no fixed agent count or per-component paperwork is required.

Recreate in-scope interactions. Preserve real outbound destinations. Rewrite links to local routes when those routes are included; leave out-of-scope destinations pointing to the source and disclose them. Visible controls must perform the behavior they promise.

Run `bun run typecheck`, targeted `bun test`, and `bun run smoke` after an integrated slice. Finish this pass when every requested section/route renders with actual assets and important controls work.

## 4. Compare, repair, repeat

Open source/local pages at the **same viewport, scroll position, and state**. Let fonts, media, and reveal animations settle. Review the whole page wherever step 2 found a rule changing, plus a viewport wider than the design; judge scroll and pointer behavior with real input. A side-by-side montage locates drift; full-size sections establish detail.

Fix the largest visible differences first: geometry, missing sections/layers, typography/wrapping, asset crop, then spacing and motion. Recheck affected views. Compare animated regions in initial, active, and settled states, including reverse scroll when relevant.

Exercise the real local workflow: navigation between cloned routes, mobile menu, tab/accordion states, carousel boundaries, primary actions, media controls, and observed scroll-linked transitions. Check runtime errors, missing assets, and horizontal overflow. When adding pages, verify existing routes still work. Use a few browser checks at these boundaries rather than assertions about class names.

Run `bun run check` and the project's production build. Completion requires a successful check **and** rendered comparison. State remaining differences precisely instead of calling an unchecked result pixel-perfect.

## Deliver

Return preview/run instructions, the source-to-local route map, representative desktop/mobile comparisons, checks actually run, and remaining visual/functional gaps. Report the Hono route map, fragment endpoints, cache classification, and `assetUrl` usage. Keep reference clones in separate apps when maintaining the reusable template.
