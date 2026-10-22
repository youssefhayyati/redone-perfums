# Architecture & implementation plan

## Shape of the application

One Laravel 13 application serves three things from the same origin:

| Surface      | URL          | Entry point                         | Notes                                    |
| ------------ | ------------ | ----------------------------------- | ---------------------------------------- |
| Storefront   | `/*`         | `resources/js/storefront/main.tsx`  | React SPA, Framer Motion, night/light    |
| Admin        | `/admin/*`   | `resources/js/admin/main.tsx`       | Separate React SPA, no storefront code   |
| JSON API     | `/api/*`     | `routes/api.php`                    | Sanctum stateful (cookie) authentication |

Serving the SPAs from Laravel keeps Sanctum's cookie + CSRF flow simple (no tokens in
`localStorage`), lets the Blade shell set the theme before first paint, and lets the server
inject the page title / description / Open Graph tags for product pages.

Both SPAs use React 19, React Router (data router, one lazily loaded chunk per page),
Tailwind CSS v4 and TypeScript. State shared across a SPA (cart, session, overlays) lives
in small `useSyncExternalStore` stores; pages load their data with a cached
`useQuery`-style hook. The storefront router (`resources/js/storefront/routes.tsx`)
mirrors `SpaController::isKnownRoute()`.

`resources/js/shared` holds what both SPAs use: the HTTP client, money and phone helpers,
French date/plural formatting, the theme controller, the store helper and TypeScript API
types. `resources/css/theme.css` holds the design tokens both stylesheets import.

## Source of truth

The server owns every number that matters: prices, pack prices, discounts, coupon
reductions, delivery fees, stock and totals. The client only sends identifiers
(variant ids, pack id, selected variant ids, city id, coupon code). The cart response is
recomputed on every request by `CartCalculator`, and `OrderPlacer` recomputes everything
again inside a database transaction with row locks before an order is written.

## Domain model

```
FragranceFamily 1─* Product *─* Collection
                     │ 1─* ProductVariant (size_ml, sku, price, stock)
                     │ 1─* ProductImage   (responsive WebP variants)
                     └ *─* Note (pivot: layer = top | heart | base)

Pack (custom | fixed)
  custom: selection_count, allowed_sizes, eligibility (all | collections | products),
          allow_duplicates, pricing (fixed price | percent | amount)
  fixed:  PackItem (variant, quantity)

Cart (token) 1─* CartItem (product variant | pack + selections[])
Order 1─* OrderItem 1─* OrderItemSelection   (all with price/name snapshots)
      1─* OrderEvent                         (status / payment / delivery log)
ProductVariant 1─* InventoryMovement         (sale, cancellation, manual adjustment)
DeliveryZone 1─* City
Coupon, NewsletterSubscriber, StoreSetting (key → JSON), Page (policies / legal)
```

## Key services (`app/Services`)

- `Packs\PackResolver`: eligibility, selection validation, and pricing (`quote`).
- `Cart\CartManager` / `Cart\CartCalculator`: cart mutations and server-side pricing, with per-line issues.
- `Checkout\OrderPlacer`: idempotent placement with locks, stock decrement and snapshots.
  It dispatches `Events\OrderPlaced` once the transaction commits (never on a replay);
  `Listeners\SendOrderPlacedNotifications` queues `NewOrderAlert` to the orders inbox
  (setting `notifications.orders_email`, else `contact.email`) and `OrderConfirmation`
  to the customer when they gave an e-mail. Production needs a queue worker.
- `Orders\OrderWorkflow`: allowed status transitions, restocking on cancel, event log.
- `Inventory\InventoryManager`: every stock change writes an `InventoryMovement`.
- `Settings\StoreSettings`: typed defaults, cached, admin-editable.
- `Media\ImageProcessor`: validates uploads and writes 480/960/1600 px WebP variants.

## Languages

The storefront speaks French (`/…`) and Modern Standard Arabic (`/ar/…`, right to left);
the admin stays French and edits both.

- **Content**: translatable columns have an `_ar` sibling (`name_ar`, `tagline_ar`…),
  listed in each model's `TRANSLATABLE`. `HasTranslations::translated()` returns the
  Arabic text when the app locale is Arabic and it is filled, the French one otherwise.
  Settings follow the same rule with `{key}_ar` keys and `StoreSettings::localized()`.
- **API**: the storefront sends `X-Locale` (never `Accept-Language`, so admin calls stay
  French); `SetLocale` applies it. Server messages are written in French and translated
  by `lang/ar.json` (and `lang/ar/*.php` for validation).
- **Pages**: `SpaController` reads the `/ar` prefix and sets `<html lang dir>`, the
  translated meta and hreflang alternates; the sitemap lists both languages.
- **Storefront copy**: written in French in the components and wrapped in `t()`,
  `tNodes()` (placeholders filled by elements) or `tn()` (counted nouns, Arabic's six
  plural forms); `resources/js/storefront/i18n/ar.ts` must translate every message, which
  the types enforce. Layout uses logical utilities (`ms-`, `ps-`, `start-`) and `rtl:`.
- **Orders**: `orders.locale` records the customer's language; their confirmation is
  sent in it, while the store's alert is always French.

## Roles

`admin` (everything), `manager` (catalog, orders, customers, promotions, content),
`support` (orders, customers), `customer`. Permissions are enforced with gates on
every admin route; the admin SPA hides what the API would refuse anyway.

## Motion principles

Framer Motion only for sequences (hero entrance, editorial reveals, image unveils,
parallax, light sweep, page curtain, grid reshuffles, cart lines, drawers). CSS
transitions for hovers. A single `MotionProvider` (`resources/js/storefront/motion`) sets
`MotionConfig`: transform and layout animations follow `prefers-reduced-motion` and are
always off on low-power devices (Save-Data, two cores or less, little memory), leaving
only opacity fades.
Reveals go through `Reveal` / `RevealGroup` / `RevealWords` / `Parallax`, and transformed
wrappers are kept away from sticky and fixed elements (the page transition only fades
the page; its curtain is a separate layer under the header).
With full motion only, `MotionProvider` also starts:
- smooth wheel scrolling (Lenis, `smoothScroll.ts`): the native scroll position is kept,
  touch stays native, overlays pause it while they lock the page;
- pointer effects (`pointerEffects.ts`), delegated from the document and drawn in CSS:
  `.btn` is magnetic, `[data-tilt]` cards turn towards the pointer with a glint. An element
  with `data-tilt` must not carry a Framer transform itself.
No scroll-jacking (snapping, pinned scroll-driven scenes), no custom cursor.

## Build order

1. Foundation: config, MySQL (Docker), migrations, models, enums, seeders.
2. Catalog API, then cart, packs and checkout API with feature tests.
3. Admin API with authorization tests.
4. Storefront design system, then homepage, then shop, product, pack builder, cart, checkout and account.
5. Admin SPA.
6. Type-check, unit tests, feature tests, production build, visual pass in both themes.
