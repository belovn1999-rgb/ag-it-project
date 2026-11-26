# Structural AUTO1 PDF editor

The browser reads page text with PDF.js and rebuilds selected PDF drawing
operations with pdf-lib. It copies the original image streams, fonts and
referenced resources into a new document. It does not render pages to JPEG,
overlay white rectangles, or copy the original annotations and metadata.

`src/auto1-engine.mjs` handles PDF tokenisation, graphics state, clipping and
object copying. `src/auto1-rules.mjs` associates text positions with the report
sections and selects, removes or moves those operations. `src/auto1.js` handles
file selection, progress, the second text verification pass and downloads.

Pages are classified by what their rows say, not by where AUTO1 broke the
text. The same report prints at different wrap points depending on the length
of the car name, the number of fields and the delivery prices, so any rule
that matched a whole page's text failed on the next car. Rows carry the
meaning: auction offers, logistics, player controls and the legal footer are
junk wherever they land; everything else is client content.

Between the cover and the first section heading AUTO1 prints only its own
logistics and offer interface, so the photos there are the sole client
content and the text is dropped. A page left with nothing is removed. In the
report body only recognised artefacts are removed, and unknown text is kept.
Document and damage images on mixed logistics pages are retained. The image
beneath the video player is retained; only the player controls are removed.

A report printed from a narrow browser window has a different shape: the
logistics column stands beside the title, the gallery runs two photos wide in
the left half of three pages, and the car's fields ("Build year" down to "Car
location") sit on pages of their own after the gallery, below the bid, VAT and
offer blocks. It is recognised by a first page without "Build year" while a
later page before the first section has it. Such a report is laid out anew
(owner's choice 2026-11-26, variant B): the title and the main photo across the
full width open page 1, the other photos follow four to a row on as many pages
as they need, then one page of fields from "Build year" to "Car location", then
the report sections unchanged. Everything above "Build year" on the fields page
and every other row on the pages before the first section is dropped. If any
step of this layout fails, the report falls back to the ordinary cleaning.

The icon printed just left of a removed counter or notice ("Total Pictures",
"No images were taken") is removed with it.

No single unrecognised detail withholds the file. A page that cannot be
parsed, or whose rules throw, is copied verbatim from the original and listed
for review; the cover falls back to removing its auction block without the
rebuilt layout, and then to the original page. The second reader names the
pages that lost text instead of rejecting the result, and those pages are
rebuilt from the original in a second pass. The UI always offers the download
and names the pages to check by eye.

The cleaning quality is established for the English reports in this
repository's samples. Other source languages, scans and arbitrary PDF
generators degrade to keeping pages unchanged rather than to failing.

Before offering a download, PDF.js reads the generated file again. It checks
the output page count, required text on its expected page (including repeated
items), and recognised auction text. This is a semantic check, not a substitute
for visual review. Preserving PDF image/text objects does not by itself prove
the behaviour of a particular desktop PDF editor.

Run the focused regression tests with `node --test scripts/auto1.test.mjs`.
They are also included in the normal `test` script. Keep vehicle fixtures and
rendered reports outside the public repository. For a new raw/approved pair,
check all pages visually, original image-stream hashes, required text, page
mapping, repeated processing, and the browser's failure/download behaviour.
