# WASABEE Restaurant Website — Pro Pack

Premium responsive restaurant website + admin control center for WASABEE Oriental Cuisine.

## Run locally

1. Install Node.js 18+ from https://nodejs.org/
2. Open this project folder in Command Prompt.
3. Run `npm install` (no external runtime packages are required, but this is safe).
4. Run `npm start`
5. Open http://localhost:3000
6. Admin: http://localhost:3000/admin/
7. Default local admin password: `wasabee-admin`

For production, set `ADMIN_PASSWORD` to a strong password.

## Pro dashboard

- Overview and live order KPIs
- 7-day sales analytics
- CSV sales report export
- Full menu CRUD: categories, items, variants, add-ons/sauces, images, visibility and per-item container charge
- Inventory quantity, low-stock alerts and availability control
- Online order management and customer location links
- Kitchen Order Ticket (KOT) view + browser print
- Table booking management
- Coupon/offer manager
- Customer review moderation
- Website settings: WhatsApp, GST, discount, default container charge, hero banners
- Public website link

## Customer website

- Responsive premium WASABEE design
- Purple `#800080` + white theme
- Hero dot slider
- Menu categories and food cards
- Variants and sauce/add-on selection
- Swiggy/Zomato-style cart drawer
- Checkout with customer details and browser current-location Google Maps link
- WhatsApp order message
- 15% default online discount and 5% GST
- Per-item container charge shown at checkout
- Table booking request to WhatsApp
- Customer reviews
- Optional coupon field

## Important

Browser geolocation works on localhost and on HTTPS production sites after the customer grants permission. WhatsApp uses the number stored in Settings.

The included menu data is based on the supplied WASABEE menu PDF. Replace food image URLs with your own licensed images from the Dashboard.

## Add-on Management

Open **Admin Dashboard → Menu Manager → Add-ons**.

1. Create an **Add-on Group** such as `Choice of Sauce`.
2. Choose whether customers can select **one** option or **multiple** options.
3. Add options such as `Chilli Soya`, `Butter Garlic`, `Oyster`, `Kung Pao`, etc. and set an optional extra price.
4. Open **Menu Manager → Items → Edit** for a dish and tick the add-on group you want to assign.
5. Customers will see the assigned add-on choices before adding the dish to cart. Add-on prices are included in the item total and WhatsApp order details.

The dashboard also keeps a legacy simple text add-on field for older menu entries.
