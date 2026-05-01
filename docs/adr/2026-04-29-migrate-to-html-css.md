# Migrate to HTML/CSS

The custom SVG layout engine is complex and difficult to maintain.
Vertical space could be saved
by making level 4 leader pills floating horizontally,
which is difficult to implement in SVG but trivial in HTML/CSS.

The risk 

## Decision

Replace the custom SVG layout engine with an HTML/CSS implementation.

## Consequences

- **Better use of vertical space** with floating leader pills.
- **Easier maintenance** of layout code.
- `dom-to-svg` as **new dependency** to convert HTML/CSS to SVG.
