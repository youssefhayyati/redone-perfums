# Architecture & implementation plan

## Shape of the application

One Laravel 13 application serves three things from the same origin:

| Surface      | URL          | Entry point                         | Notes                                    |
| ------------ | ------------ | ----------------------------------- | ---------------------------------------- |
| Storefront   | `/*`         | `resources/js/storefront/main.ts`   | Vue 3 SPA, GSAP motion, night/light      |
| Admin        | `/admin/*`   | `resources/js/admin/main.ts`        | Separate Vue SPA, no storefront code     |
| JSON API     | `/api/*`     | `routes/api.php`                    | Sanctum stateful (cookie) authentication |

Serving the SPAs from Laravel keeps Sanctum's cookie + CSRF flow simple (no tokens in
`localStorage`), lets the Blade shell set the theme before first paint, and lets the server
inject the page title / description / Open Graph tags for product pages.

`resources/js/shared` holds what both SPAs use: the HTTP client, money and phone helpers,
the theme controller, i18n, and TypeScript API types.

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
- `Orders\OrderWorkflow`: allowed status transitions, restocking on cancel, event log.
- `Inventory\InventoryManager`: every stock change writes an `InventoryMovement`.
- `Settings\StoreSettings`: typed defaults, cached, admin-editable.
- `Media\ImageProcessor`: validates uploads and writes 480/960/1600 px WebP variants.

## Roles

`admin` (everything), `manager` (catalog, orders, customers, promotions, content),
`support` (orders, customers), `customer`. Permissions are enforced with gates on
every admin route; the admin SPA hides what the API would refuse anyway.

## Motion principles

GSAP + ScrollTrigger only for sequences (hero entrance, editorial reveals, parallax,
light sweep, pack composition). CSS transitions for hovers. Every GSAP context is
created through `useMotion()`, which reverts timelines and ScrollTriggers on unmount
and turns effects off under `prefers-reduced-motion` or on low-power devices.
No scroll hijacking, no custom cursor.

## Build order

1. Foundation: config, MySQL (Docker), migrations, models, enums, seeders.
2. Catalog API, then cart, packs and checkout API with feature tests.
3. Admin API with authorization tests.
4. Storefront design system, then homepage, then shop, product, pack builder, cart, checkout and account.
5. Admin SPA.
6. Type-check, unit tests, feature tests, production build, visual pass in both themes.
