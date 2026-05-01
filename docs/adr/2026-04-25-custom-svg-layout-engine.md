# Custom SVG Layout Engine

Printing the org chart is a major requirement for this project.
The layout rendered by `d3-org-chart` is too large in width
and too difficult to customize.

## Decision

Implement a custom SVG layout engine to render the org chart.

## Consequences

- **No dependency** on `d3-org-chart`.
- **Full control** over the layout and styling of the org chart.
- **Higher complexity** of custom layout engine implementation.
