const fs = require('fs');

// Approximate dimensions and grid to match the layout
const scale = 3; // 1 ft = 3 SVG units roughly

// Road widths
const roadWidth = 25 * scale;
const topRoadWidth = 30 * scale;

// Plot blocks starting X
const block1X = 100;
const block1Width = 61 * scale;

const road1X = block1X + block1Width;

const block2X = road1X + roadWidth;
const block2Width = 50 * scale;

const block3X = block2X + block2Width;
const block3Width = 50 * scale;

const road2X = block3X + block3Width;

const block4X = road2X + roadWidth;
const block4Width = 50 * scale;

const block5X = block4X + block4Width;
const block5Width = 56 * scale; // Plot 1 is 56'11"

// Generate polygons for each plot
const generatePoly = (x, y, w, h, skewY = 0) => {
    // Top-left, Top-right, Bottom-right, Bottom-left
    const tl = `${x},${y + x*skewY}`;
    const tr = `${x+w},${y + (x+w)*skewY}`;
    const br = `${x+w},${y+h + (x+w)*skewY}`;
    const bl = `${x},${y+h + x*skewY}`;
    return `${tl} ${tr} ${br} ${bl}`;
};

const skew = 0.03; // slight angle of the whole layout
let startY = 150; // below top road

let plots = [];

// Block 1 (18, 19)
plots.push({ id: '18', area: 1484, type: 'Plot', status: 'Available', facing: 'East', size: '61\'4" x 24\'6"', points: generatePoly(block1X, startY, block1Width, 24.5*scale, skew) });
plots.push({ id: '19', area: 1513, type: 'Plot', status: 'Available', facing: 'East', size: '60\'6" x 24\'6"', points: generatePoly(block1X, startY + 24.5*scale, block1Width, 24.5*scale, skew) });

// Block 2 (13, 14, 15, 16, 17)
let b2Y = startY;
['13', '14', '15', '16'].forEach((id, idx) => {
    plots.push({ id, area: 1225, type: 'Plot', status: 'Available', facing: 'West', size: '50\' x 24\'6"', points: generatePoly(block2X, b2Y + idx*24.5*scale, block2Width, 24.5*scale, skew) });
});
plots.push({ id: '17', area: 991, type: 'LIG', status: 'Available', facing: 'West', size: '50\'8" x 17\'6"', points: generatePoly(block2X, b2Y + 4*24.5*scale, block2Width, 17.5*scale, skew) });

// Block 3 (12, 11, 10, 9)
let b3Y = startY;
['12', '11', '10'].forEach((id, idx) => {
    plots.push({ id, area: 1225, type: 'Plot', status: 'Booked', facing: 'East', size: '50\' x 24\'6"', points: generatePoly(block3X, b3Y + idx*24.5*scale, block3Width, 24.5*scale, skew) });
});
plots.push({ id: '9', area: 1699, type: 'Plot', status: 'Available', facing: 'East', size: '50\'8" x 29\'10"', points: generatePoly(block3X, b3Y + 3*24.5*scale, block3Width, 29.8*scale, skew) });

// Block 4 (5, 6, 7, 8)
let b4Y = startY + 5; // slightly lower due to angle
['5', '6', '7'].forEach((id, idx) => {
    plots.push({ id, area: 1225, type: 'Plot', status: 'Available', facing: 'West', size: '50\' x 24\'6"', points: generatePoly(block4X, b4Y + idx*24.5*scale, block4Width, 24.5*scale, skew) });
});
plots.push({ id: '8', area: 1076, type: 'LIG', status: 'Sold', facing: 'West', size: '50\'8" x 17\'6"', points: generatePoly(block4X, b4Y + 3*24.5*scale, block4Width, 17.5*scale, skew) });

// Block 5 (4, 3, 2, 1)
let b5Y = startY + 10;
plots.push({ id: '4', area: 638, type: 'Plot', status: 'Sold', facing: 'East', size: '35\'3" x 24\'6"', points: generatePoly(block5X, b5Y, 35*scale, 24.5*scale, skew) });
plots.push({ id: '3', area: 774, type: 'Plot', status: 'Available', facing: 'East', size: '42\'1" x 24\'6"', points: generatePoly(block5X, b5Y + 24.5*scale, 42.1*scale, 24.5*scale, skew) });
plots.push({ id: '2', area: 910, type: 'Plot', status: 'Booked', facing: 'East', size: '48\'11" x 24\'6"', points: generatePoly(block5X, b5Y + 2*24.5*scale, 48.9*scale, 24.5*scale, skew) });
plots.push({ id: '1', area: 1404, type: 'Plot', status: 'Available', facing: 'East', size: '56\'11" x 31\'0"', points: generatePoly(block5X, b5Y + 3*24.5*scale, 56.9*scale, 31*scale, skew) });

plots = plots.map(p => ({...p, name: 'Plot ' + p.id}));

fs.writeFileSync('src/data/plots.json', JSON.stringify(plots, null, 2));
