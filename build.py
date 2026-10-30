
from pathlib import Path
import json
import zipfile

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"

BROWSERS = {
    "chrome": ROOT / "Chrome",
    "edge": ROOT / "Edge",
    "firefox": ROOT / "Firefox",
}

REQUIRED_FILES = [
    "manifest.json",
    "background.js",
    "content.js",
    "default-config.js",
    "popup.html",
    "popup.js",
    "options.html",
    "options.js",
]

def build_extension(browser, folder):
    print(f"\nBuilding {browser}...")

    if not folder.is_dir():
        raise FileNotFoundError(
            f"Missing browser folder: {folder}"
        )

    for filename in REQUIRED_FILES:
        if not (folder / filename).is_file():
            raise FileNotFoundError(
                f"{browser}: Missing {filename}"
            )

    manifest_path = folder / "manifest.json"

    with manifest_path.open(encoding="utf-8") as f:
        manifest = json.load(f)

    version = manifest.get("version", "1.0.0")

    if manifest.get("manifest_version") != 3:
        raise ValueError(
            f"{browser}: Expected Manifest V3"
        )

    output = DIST / (
        f"tdx-presets-{browser}-{version}.zip"
    )

    with zipfile.ZipFile(
        output,
        "w",
        zipfile.ZIP_DEFLATED
    ) as archive:

        for file in sorted(folder.rglob("*")):
            if not file.is_file():
                continue

            if file.name.startswith("."):
                continue

            relative_path = file.relative_to(folder)

            archive.write(
                file,
                arcname=str(relative_path)
            )

    print(f"Created: {output.name}")


def main():
    DIST.mkdir(parents=True, exist_ok=True)

    for browser, folder in BROWSERS.items():
        build_extension(browser, folder)

    print("\nAll browser packages built successfully!")


if __name__ == "__main__":
    main()
