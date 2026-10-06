# Web programming study site

Interactive study site for web programming: concept cards, interactive tools (Flexbox and Grid
playgrounds, specificity calculator, Git simulator, event loop, Express middleware, mock REST
API, SQL runner, MongoDB playground, JWT/CORS and more), self-check quizzes, printable
summaries and a progress tracker.

Plain HTML, CSS and JavaScript: no build step and no CDN. Third-party files the browser needs
live in `vendor/`.

## Run it

```sh
npm install        # only needed for the checks below
npm run serve      # http://localhost:8080
npm test           # engine unit tests (node:test, no install needed)
npm run pdfs       # print each section summary to assets/pdf/ (Playwright)
npm run check      # crawl every route at 1280 px, 375 px and dark, plus axe WCAG 2.1 AA
```

The site is published to GitHub Pages by `.github/workflows/pages.yml` on every push to `main`.
