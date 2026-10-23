# World command center scene brief

## Intent

The world route is an archive observatory, not a generic analytics dashboard. The visitor stands at the centre of a cylindrical display whose inner wall carries an equirectangular world map. Horizontal gestures and drags turn the continuous ring; vertical wheel movement and pinch gestures zoom the view.

## Reference translation

- Keep the references' concave wall, pale cartographic layers, longitude/latitude grid, restrained radar pulses, and floating translucent readouts.
- Preserve the archive site's mint, bone, ink, and mist palette in both themes. Do not copy the references' characters, UI panels, or bright primary colours.
- The map fills the entire viewport behind the navigation. A restrained heading, readable floating city dossier, and named place index sit over it without resizing the map canvas.

## Composition and interaction

- A seamless 360-degree cylinder surrounds a perspective camera. Its unwrapped surface matches the map's 2:1 aspect ratio: height = circumference / 2. The previous fixed height compressed latitude by approximately 4.8 times.
- Twenty-four city nodes use real latitude/longitude data. Explicit graph edges form regional and intercontinental routes rather than one sequential polyline.
- Selected nodes turn to the camera and tighten its field of view from 46 to 40 degrees. Camera height follows the city's latitude without tilting the map. Manual rotation preserves the current zoom; overview restores 46 degrees. The dossier preserves local time, live Open-Meteo weather, coordinates, and the archive note.
- Light and dark mode swap the cartographic texture, graticule, route, and glow palette inside Three.js; this is not a full-canvas brightness filter.
- The dossier stays still for reading. Connected destinations expand on demand from the actual route graph; there is no decorative fake route readout.
- Only the selected node pulses gently. Hover and focus reveal labels; all city names remain available in the horizontally scrolling index.
- Reduced-motion preferences and unavailable WebGL fall back to the existing planar atlas.

## Constraints

- The cylinder texture is generated from the bundled CC0 Natural Earth/Robinson SVG by inverting its Robinson coordinates into an equirectangular map; no new map data or runtime dependency is introduced.
- Keep draw calls and geometry modest: one map surface, one grid surface, one connection-line group, and HTML node controls projected from Three.js.
- Vertical wheel movement zooms; horizontal trackpad movement rotates. Pointer and one-finger drags move freely in longitude and latitude; arrow keys pan in both directions. Latitude is bounded using the current field of view to avoid exposing the cylinder's top or bottom. Pinch gestures zoom on touch devices. Visible plus/minus/overview controls and keyboard plus/minus support zoom between 28 and 78 degrees. Mobile uses a floating compact city summary with an explicit dossier expansion button; opening it does not resize the map. The selected index item scrolls into view without changing button widths on hover.
- The existing vector sources are rasterized at up to 8192 × 4096 on desktop and 4096 × 2048 on mobile, bounded by the GPU's texture limit. Only the active theme's texture remains resident after switching; anisotropic filtering uses up to 16 samples. Source SVG paths and city coordinates are unchanged.
- Preserve existing theme switching, live weather, accessibility labels, and static export compatibility.

