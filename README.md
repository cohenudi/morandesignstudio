# morandesignstudio.com — static mirror

A crawled, offline copy of https://www.morandesignstudio.com/
captured **2026-08-25**.

## What this is (and isn't)

This is the **rendered output** of the site, not its original source code.
The site runs on **WordPress 6.8.3 + Elementor 3.14.1** (Hello Elementor
theme, Yoast SEO Premium), in Hebrew / RTL.

Crawling over HTTP can only retrieve what the server sends to a browser:
HTML, CSS, JS, images and fonts. It **cannot** retrieve:

- PHP theme and plugin source (`wp-content/themes`, `wp-content/plugins` `.php` files)
- `wp-config.php` or any server configuration
- The MySQL database, which is where all page/post content actually lives
- Anything behind `/wp-admin`

To get the *true* source you need either SFTP/hosting-panel access to the
server plus a database dump, or **WP Admin → Tools → Export** for content.

## Contents

| | |
|---|---|
| Pages (HTML) | 69 files / 38 distinct pages |
| Total files | ~710 |
| Total size | ~181 MB |

All 36 URLs listed in the site's Yoast sitemap are present, plus 2
pagination archives found by following links.

Directory layout mirrors the live URL structure:

- `index.html` — home page
- `<hebrew-slug>/index.html` — pages and blog posts
- `blog/`, `פרוייקטים/`, `חבילות-עיצוב/`, `קצת-עלי/`, `customers-recommend/` — main sections
- `<family-name>/` — individual project pages
- `author/`, `category/` — WordPress archives
- `wp-content/uploads/` — all media (the bulk of the size)
- `wp-content/plugins/`, `wp-content/themes/`, `wp-includes/` — front-end CSS/JS/font assets

## Viewing it locally

Asset filenames keep WordPress's `?ver=` cache-busting suffix, so serve
over HTTP rather than opening files directly:

    cd ~/work/morandesignstudio && python3 -m http.server 8777

Then open http://127.0.0.1:8777/ — verified rendering correctly with all
assets resolving.

## Known limitations

- **External links were deliberately not crawled**, per scope. Links to
  Facebook, Instagram, WhatsApp, Google Fonts (`fonts.gstatic.com`) and
  other third-party sites still point at their live URLs.
- Dynamic WordPress endpoints don't exist in a static copy. The Chaty
  chat widget calls `wp-admin/admin-ajax.php` and will log a CORS error
  in the console — harmless, and expected.
- `<link rel>` metadata (RSS feeds, `wp-json`, oEmbed, `xmlrpc.php`) still
  references the live domain. These are machine-readable endpoints, not
  navigable pages, and were intentionally excluded.
- The contact form will not submit; it posts to the live server.

---

## S3 deployment notes

The `s3-ready` branch normalises the raw crawl for static hosting. Changes vs
the `original dump` commit:

- Stripped WordPress `?ver=` / `?v=` cache-busting suffixes from 89 filenames.
  These put a literal `?` in the S3 object key, which CloudFront normalises
  back into a query-string delimiter and then fails to resolve.
- That also fixes **Content-Type**: files previously ended `.0`, `.1`,
  `.11654064607`, so `aws s3 sync` would have uploaded ~32 JavaScript files as
  `application/octet-stream` and browsers would refuse to execute them.
  All 671 files now have a guessable MIME type.
- Removed 31 `index.html?p=NNN.html` WordPress shortlink alias pages, and
  repointed the 910 links that referenced them (including the whole main nav)
  at the real canonical pages.
- Rewrote 1,408 absolute `https://www.morandesignstudio.com/...` references to
  relative local paths, so the mirror is self-contained.

Verified: 2,958 local references, 0 broken.

### Uploading

    aws s3 sync . s3://YOUR-BUCKET/ --delete \
      --exclude ".git/*" --exclude "README.md"

### Serving

Pages live at `<slug>/index.html`, so directory URLs need index resolution:

- **S3 static website endpoint** — set Index document to `index.html`.
  Subdirectory index resolution works out of the box. HTTP only.
- **CloudFront + private S3 (OAC)** — needed for HTTPS on a custom domain.
  The REST origin does *not* resolve subdirectory indexes; attach a
  CloudFront Function (viewer-request) that appends `index.html` to any URI
  ending in `/`.

Set `Content-Type` correctly on upload (aws-cli infers from extension, which
now works). Fonts may need explicit types if your CLI lacks `.woff2`.

### Rendering fix: collapsed spacers (`wp-content/mirror-fixes.css`)

The live site has a latent Elementor bug that the mirror faithfully reproduced.
Elementor publishes a `--spacer-size` custom property for every spacer widget
(in `wp-content/uploads/elementor/css/post-*.css`), but the rule that *consumes*
it lives in Elementor's `widget-spacer.min.css` — which this site never enqueues.
With no consumer, every spacer computes to `height: 0`.

On the home page the hero relies on a 510px spacer for its height, so the whole
background slideshow collapsed to a ~20px sliver. The slideshow itself was
working the whole time — images were loading and cycling, there was just no
height to show them in.

`wp-content/mirror-fixes.css` restores the one missing declaration and is linked
from all 38 pages. Verified: hero 20px -> 530px.

Note this bug is present on the live site too — it is not a crawl artifact.

### Project pages have no header image

Project pages (`cohen-family/`, `metzada-23/`, …) show a plain light band above
the title. That matches the live site exactly: their page CSS references only
the decorative brush graphic (`מרקר.png`) and a stripe, with no hero photo. The
mirror is not missing anything here.
