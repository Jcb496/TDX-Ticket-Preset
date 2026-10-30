# TDX Account & Access Presets — cross-browser source (v3.0.0)

One Manifest V3 WebExtension codebase for Chrome, Edge and Safari. The extension fills the same ticket fields as the original script, preserves custom presets and floating toolbar position, and can fetch **data-only** preset definitions from an HTTPS URL.

## Try locally

- Chrome: `chrome://extensions` → Developer mode → Load unpacked → select `extension/`.
- Edge: `edge://extensions` → Developer mode → Load unpacked → select `extension/`.
- Safari (macOS): Xcode and Safari Web Extension converter are required. Run `xcrun safari-web-extension-converter /absolute/path/to/extension --project-location /absolute/path/to/output` on a Mac with Xcode, then configure signing and build the resulting app/extension in Xcode. The Safari archive in `dist/` contains WebExtension source, **not** an installable signed Safari app.

Disable the original Tampermonkey userscript before testing. Use a non-critical TDX ticket for validation.

## Central preset updates

1. Publish `config/presets.json` as a publicly reachable, HTTPS-served JSON file (e.g. GitHub Pages or your own server). No ticket/customer data should go in this file.
2. Open the installed extension's **Options** page and paste the direct JSON URL. Accept the one-time permission for that host. Click Save.
3. On each ticket page load, the extension checks the remote JSON if the last check is older than 1 hour; it uses the last good cached config on failures, then the bundled config if no cache exists. To check immediately, use the Options page button and refresh the ticket.
4. Edit and publish JSON to update built-in preset names, subjects, service labels, form ID and supported common field values for users configured to the same URL. JSON cannot run scripts or change the extension's permissions.

**Important:** The remote URL is not yet hardcoded because you haven't provided a production URL. Each user must configure it once in Options in this build. For truly zero-setup central updates, publish the JSON to a stable domain you control, then set a default URL in the code and declare the corresponding host permission in the release manifest (subject to browser/store review). If remote config is on a private network, users must be able to access it.

## Code updates and publishing

- Change extension source, bump `version` in `build.py`, run `python build.py`, and submit a new package to the Chrome Web Store and Microsoft Edge Add-ons. Browser store installs automatically receive approved updates.
- Safari requires an Apple Developer account, Xcode conversion/signing, App Store Connect distribution, and Apple's review/update process. Safari updates are delivered via Apple's app update mechanism.
- This repo includes a GitHub Actions workflow to generate archives on a version tag; it **does not automatically publish** to browser stores or Apple. Those require developer accounts, API credentials, store listings and review.
- Do not fetch or execute remote JavaScript: only validated JSON preset data is supported.

## Privacy and caveats

- Runs only on `https://tdx.vanderbilt.edu/TDNext/Apps/34/Tickets/Edit*`.
- User-created custom presets and toolbar position stay in `chrome.storage.local` and are never uploaded by this code.
- The extension requests optional access to the remote configuration host when the user sets the URL; that host receives a normal HTTP request, potentially including IP/network metadata.
- Original userscript storage migration is attempted once from page localStorage, but isolated content-script access and browser differences can affect migration. Export/backup existing presets before switching if important.
- The original script contains a default named contact (Clay Bishop) in the common fields. Verify this is appropriate for every user before distributing; adjust in both `extension/default-config.js` and hosted JSON.
- TDX/Kendo widgets and Safari browser behavior require hands-on testing; automated syntax checks do not establish compatibility.
- Chrome/Edge ZIPs are source packages ready for developer testing/submission, not already published store installs.
