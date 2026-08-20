/**
 * Converts a pixel point to a LatLng coordinate based on the map's bounds.
 * 
 * @param {Object} pixelPoint - { x, y }
 * @param {Object} bounds - { topLeft: { lat, lng }, bottomRight: { lat, lng } }
 * @param {Object} imageDimensions - { width, height }
 * @returns {Array} - [lat, lng] for Leaflet
 */
export const pixelToLatLng = (pixelPoint, bounds, imageDimensions) => {
  if (!pixelPoint || !bounds || !imageDimensions) return null;
  const { x, y } = pixelPoint;
  const { topLeft, bottomRight } = bounds;
  const { width, height } = imageDimensions;

  if (!topLeft || !bottomRight || !width || !height) return null;

  const xFraction = x / width;
  const yFraction = y / height;

  const lng = topLeft.lng + xFraction * (bottomRight.lng - topLeft.lng);
  const lat = topLeft.lat + yFraction * (bottomRight.lat - topLeft.lat);

  return [lat, lng];
};

/**
 * Transforms an SVG polygon points string into an array of Leaflet LatLng arrays.
 * 
 * @param {string} pointsString - e.g., "10,20 30,40 50,60"
 * @param {Object} bounds - { topLeft: { lat, lng }, bottomRight: { lat, lng } }
 * @param {Object} imageDimensions - { width, height }
 * @returns {Array} - Array of [lat, lng] tuples
 */
export const transformPlotPoints = (pointsString, bounds, imageDimensions) => {
  if (!pointsString || !bounds || !imageDimensions) return [];
  
  const points = pointsString.trim().split(/\s+/).map(p => {
    const coords = p.split(',');
    if (coords.length === 2) {
      return { x: parseFloat(coords[0]), y: parseFloat(coords[1]) };
    }
    return null;
  }).filter(Boolean);

  return points.map(p => pixelToLatLng(p, bounds, imageDimensions)).filter(Boolean);
};
