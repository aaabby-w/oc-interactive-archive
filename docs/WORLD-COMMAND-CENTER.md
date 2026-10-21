# World command center scene brief

## Intent

The world route is an archive observatory, not a generic analytics dashboard. The visitor stands at the centre of a cylindrical display whose inner wall carries an equirectangular world map. Vertical wheel or trackpad movement turns the room horizontally; touch and pointer drags move the same continuous ring.

## Reference translation

- Keep the references' concave wall, pale cartographic layers, longitude/latitude grid, restrained radar pulses, and floating translucent readouts.
- Preserve the archive site's mint, bone, ink, and mist palette in both themes. Do not copy the references' characters, UI panels, or bright primary colours.
- The map remains the dominant visual. Copy, navigation, and telemetry float at the edges so the page reads as a room before it reads as a list.

## Composition and interaction

- A seamless 360-degree cylinder surrounds a perspective camera at the origin.
- Twenty-four city nodes use real latitude/longitude data. Explicit graph edges form regional and intercontinental routes rather than one sequential polyline.
- Selected nodes turn to the camera and tighten the field of view. A glass panel shows local time, live Open-Meteo weather, coordinates, and a deliberately provisional archive note.
- Light and dark mode swap the cartographic texture, graticule, route, and glow palette inside Three.js; this is not a full-canvas brightness filter.
- The selected-city glass and secondary telemetry float by a few pixels with fine-pointer movement, with a local highlight that follows the cursor. Touch and reduced-motion modes keep them still.
- Selected and priority nodes use bounded radar pulses: rings reach a fixed radius, fade, and restart.
- Reduced-motion preferences and unavailable WebGL fall back to the existing planar atlas.

## Constraints

- The cylinder texture is generated from the bundled CC0 Natural Earth/Robinson SVG by inverting its Robinson coordinates into an equirectangular map; no new map data or runtime dependency is introduced.
- Keep draw calls and geometry modest: one map surface, one grid surface, one connection-line group, and HTML node controls projected from Three.js.
- Desktop uses wheel, trackpad, drag, click, and keyboard. Mobile keeps the same scene with swipe rotation and a compact bottom sheet/node rail.
- Preserve existing theme switching, live weather, accessibility labels, and static export compatibility.

