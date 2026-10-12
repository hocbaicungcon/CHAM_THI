# Thư viện lưu cục bộ

Tất cả các thư viện bên dưới, kể cả PDF worker, font và bảng ký tự PDF, được phục vụ từ chính website. Không tải JavaScript từ CDN khi mở web.

| Thư viện | Phiên bản | Nguồn chính thức | Giấy phép |
| --- | --- | --- | --- |
| SheetJS CE | 0.20.3 | https://docs.sheetjs.com/ | Apache-2.0, `xlsx/LICENSE` |
| jsQR | 1.4.0 | https://github.com/cozmo/jsQR | Apache-2.0, `jsqr/LICENSE` |
| PDF.js | 5.6.205 | https://mozilla.github.io/pdf.js/ | Apache-2.0, `pdfjs/LICENSE` |
| pdf-lib | 1.17.1 | https://pdf-lib.js.org/ | MIT, `pdf-lib/LICENSE.md` |

SheetJS và jsQR lấy từ bản phát hành chính thức. PDF.js và pdf-lib lấy từ bộ phụ thuộc đã cài trong môi trường làm việc. Giữ cả thư mục `vendor/` khi đưa lên GitHub Pages.

PDF.js classic scripts (`pdf.min.js`, `pdf.worker.min.js`) are generated from the bundled 5.6.205 standalone modules with `node scripts/build-pdf-classic.cjs`. The generator removes the final export declaration and replaces `import.meta.url` with the current script URL; library/worker versions and licenses stay identical. The app uses a same-origin classic worker and a local main-thread fallback, avoiding module-worker and blob-wrapper imports.
