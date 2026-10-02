# Options Suite

Two calculators for index options traders in India. They run entirely in the browser.

- **Target price.** From your buy price, lots and profit target, it finds the sell price that delivers that net profit after
  brokerage, STT, exchange fee, SEBI fee, stamp duty and GST. It also shows the breakeven price, the capital you will have
  for the next trade, and the price needed for other targets.
- **Compounding plan.** How many trades it takes to grow capital from one figure to another, and what that means per day
  and per month.

Covers Nifty 50, Bank Nifty and Sensex options. Charges follow Upstox's published schedule.
This project is not affiliated with or endorsed by Upstox, NSE or BSE. Its output is an estimate, not investment advice.

## Run it

Node 22 or newer is needed for the dev server and the tests. The app itself is plain static files with no build step and no
dependencies to install.

```sh
npm start      # http://127.0.0.1:8080
npm test
```

## Layout

```
public/                 The whole site. Deploy this folder and nothing else.
  index.html
  css/                  tokens, base, layout, components, responsive
  js/
    config/             Rates, contract sizes, defaults. Numbers only.
    engine/             Pure maths. No DOM.
    ui/                 Formatting and rendering.
    main.js             State and wiring.
  _headers              Security and caching headers for Netlify and Cloudflare Pages.
scripts/
  dev-server.js         Static server for local work, bound to 127.0.0.1.
  verify-live.js        Checks the calculator against Upstox's own charges API.
tests/                  node:test suites.
docs/
  ARCHITECTURE.md       How it fits together and how to change it.
  TARIFF.md             Every rate, where it came from, and how sure we are.
```

## Deploy

Publish the `public/` folder. There is no build command.

- **Netlify and Cloudflare Pages:** set the publish directory to `public`. The `_headers` file is applied automatically.
- **GitHub Pages:** publish the contents of `public/`. Pages cannot set response headers, so the `<meta>` Content-Security-Policy
  still applies but `frame-ancestors` and the other headers in `_headers` do not.
- **Any other host:** serve `public/` and copy the headers from `public/_headers` into the host's own configuration.

Do not point a host at the repository root. Keep `.env` out of anything that is published; that is why the site lives in `public/`.

Every response is sent with `Cache-Control: no-cache`, so browsers revalidate on each visit and a deploy is picked up
straight away. There are no version strings to bump.

The page loads the Plus Jakarta Sans font from Google Fonts and falls back to system fonts if that is blocked. To self-host it,
put the font files in `public/fonts/`, add the `@font-face` rules to `css/base.css`, and remove the two Google hosts from the
`Content-Security-Policy` meta tag in `index.html`.

## Keeping the rates right

Rates and contract sizes live in `public/js/config/`. [docs/TARIFF.md](docs/TARIFF.md) lists each figure with its source and
the date it was last checked. The tests fail if that page and the code disagree.

To compare the calculator with Upstox's own numbers for a real contract:

```sh
cp .env.example .env         # then paste today's access token into .env
npm run verify:live -- --instrument-key "NSE_FO|12345" --quantity 65
```

It asks Upstox's charges API about a buy and a sell, lines every charge up against this calculator, and exits 1 if any differ.
Access tokens expire daily at about 3:30 AM IST. The token is never printed. `npm run verify:live -- --help` explains the options
and where to find a current instrument key.

## Tests

`npm test` runs without installing anything. The suites cover:

- **Charges and options.** Reference values computed independently, plus a grid of over 2,000 trades checking that the sell price is
  the lowest tick that delivers the target.
- **Compounding.** Reference plans, edge cases, and a grid checking the trade count is the smallest that reaches the goal.
- **Formatting.** Indian digit grouping, signs, compact amounts.
- **The live check.** The Upstox response handling, with mocked replies, including that the token never reaches the output.
- **The dev server.** Content types, headers and path traversal.
- **The project itself.** Every element the scripts use exists in the HTML, no unused CSS or variables, no inline scripts or
  styles, contrast ratios, the docs matching the config, and a scan for committed secrets.

## Browser support

Current Chrome, Edge, Firefox and Safari. The page uses ES modules, the `<dialog>` element and CSS `:has()`.

## Licence

MIT. See [LICENSE](LICENSE). Icons are adapted from [Feather](https://feathericons.com), also MIT.
