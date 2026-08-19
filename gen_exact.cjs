const fs = require('fs');

// We will use 1 unit = 1 foot.
// To make it look good on screen, we'll scale the SVG viewBox in React.
const scale = 2; 

// X coordinates of vertical lines
const startX = 200; // Offset from left

// The top road is angled. Let's define the top-left corner of each block and the angle.
// Top road drops slightly as it goes right. Let's say it drops 5 feet over 300 feet.
const topAngleDrop = 0.02; // y = x * topAngleDrop

// The bottom boundary (To Saida) rises slightly as it goes right.
const bottomAngleRise = -0.05; // y = baseline + x * bottomAngleRise

let plots = [];

// Helper to create plot
const createPlot = (id, name, type, area, tl, tr, br, bl, status, facing, size) => {
    plots.push({
        id, name, type, area, status, facing, size,
        points: `${tl.x*scale},${tl.y*scale} ${tr.x*scale},${tr.y*scale} ${br.x*scale},${br.y*scale} ${bl.x*scale},${bl.y*scale}`
    });
};

// --- Block 1 (Left of first 25' road) ---
// Dharsa road is angled. Let's say top-left is (startX, 100) and bottom-left is (startX - 20, 250)
const b1_TR_X = startX + 61.33; // 61'4"
const b1_BR_X = startX + 62.5;  // 62'6"
const b1_Y0 = 100;

const p18_tl = { x: startX, y: b1_Y0 };
const p18_tr = { x: b1_TR_X, y: b1_Y0 + (b1_TR_X - startX)*topAngleDrop };
const p18_br = { x: b1_TR_X, y: p18_tr.y + 24.5 };
const p18_bl = { x: startX - 4, y: p18_tl.y + 24.5 };

createPlot('18', 'Plot 18', 'Plot', 1484, p18_tl, p18_tr, p18_br, p18_bl, 'Available', 'East', '61\'4" x 24\'6"');

const p19_tl = p18_bl;
const p19_tr = p18_br;
const p19_br = { x: b1_BR_X, y: p19_tr.y + 24.5 };
const p19_bl = { x: startX - 8, y: p19_tl.y + 24.5 };

createPlot('19', 'Plot 19', 'Plot', 1513, p19_tl, p19_tr, p19_br, p19_bl, 'Available', 'East', '60\'6" x 24\'6"');

// --- Block 2 (Right of 25' road) ---
const b2_startX = b1_BR_X + 25; // 25' road
const b2_width = 50;
const b2_Y0 = b1_Y0 + (b2_startX - startX)*topAngleDrop;

let currentY_TL = b2_Y0;
let currentY_TR = b2_Y0 + b2_width*topAngleDrop;

const addB2Plot = (id, heightL, heightR, area, size, type="Plot") => {
    let tl = { x: b2_startX, y: currentY_TL };
    let tr = { x: b2_startX + b2_width, y: currentY_TR };
    let bl = { x: b2_startX, y: currentY_TL + heightL };
    let br = { x: b2_startX + b2_width, y: currentY_TR + heightR };
    createPlot(id, `Plot ${id}`, type, area, tl, tr, br, bl, 'Available', 'West', size);
    currentY_TL += heightL;
    currentY_TR += heightR;
};

addB2Plot('13', 24.5, 24.5, 1225, '50\' x 24\'6"');
addB2Plot('14', 24.5, 24.5, 1225, '50\' x 24\'6"');
addB2Plot('15', 24.5, 24.5, 1225, '50\' x 24\'6"');
addB2Plot('16', 24.5, 24.5, 1225, '50\' x 24\'6"');
addB2Plot('17', 15.58, 22.5, 991, '50\'8" x 17\'6"', 'LIG'); // Left height is shorter due to bottom road angle

// --- Block 3 (Back-to-back with Block 2) ---
const b3_startX = b2_startX + b2_width; 
const b3_width = 50;
let currentY_TL3 = b2_Y0 + b2_width*topAngleDrop;
let currentY_TR3 = currentY_TL3 + b3_width*topAngleDrop;

const addB3Plot = (id, heightL, heightR, area, size) => {
    let tl = { x: b3_startX, y: currentY_TL3 };
    let tr = { x: b3_startX + b3_width, y: currentY_TR3 };
    let bl = { x: b3_startX, y: currentY_TL3 + heightL };
    let br = { x: b3_startX + b3_width, y: currentY_TR3 + heightR };
    createPlot(id, `Plot ${id}`, 'Plot', area, tl, tr, br, bl, 'Booked', 'East', size);
    currentY_TL3 += heightL;
    currentY_TR3 += heightR;
};

addB3Plot('12', 24.5, 24.5, 1225, '50\' x 24\'6"');
addB3Plot('11', 24.5, 24.5, 1225, '50\' x 24\'6"');
addB3Plot('10', 24.5, 24.5, 1225, '50\' x 24\'6"');
addB3Plot('9',  24.5, 29.83, 1699, '50\'8" x 29\'10"'); // Right height is longer

// --- Block 4 (Right of 25' road) ---
const b4_startX = b3_startX + b3_width + 25; // 25' road
const b4_width = 50;
let currentY_TL4 = b1_Y0 + (b4_startX - startX)*topAngleDrop;
let currentY_TR4 = currentY_TL4 + b4_width*topAngleDrop;

const addB4Plot = (id, height, area, size, type="Plot") => {
    let tl = { x: b4_startX, y: currentY_TL4 };
    let tr = { x: b4_startX + b4_width, y: currentY_TR4 };
    let bl = { x: b4_startX, y: currentY_TL4 + height };
    let br = { x: b4_startX + b4_width, y: currentY_TR4 + height };
    createPlot(id, `Plot ${id}`, type, area, tl, tr, br, bl, 'Available', 'West', size);
    currentY_TL4 += height;
    currentY_TR4 += height;
};

addB4Plot('5', 24.5, 1225, '50\' x 24\'6"');
addB4Plot('6', 24.5, 1225, '50\' x 24\'6"');
addB4Plot('7', 24.5, 1225, '50\' x 24\'6"');
addB4Plot('8', 17.5, 1076, '50\'8" x 17\'6"', 'LIG'); // height is 17.5

// --- Block 5 (Back-to-back with Block 4) ---
const b5_startX = b4_startX + b4_width;
let currentY_TL5 = currentY_TL4 - (24.5*4); // reset to top
let currentY_TR5 = currentY_TL5 + 35*topAngleDrop; // width varies

const addB5Plot = (id, widthTop, widthBottom, height, area, size) => {
    let tl = { x: b5_startX, y: currentY_TL5 };
    let tr = { x: b5_startX + widthTop, y: currentY_TL5 + widthTop*topAngleDrop };
    let bl = { x: b5_startX, y: currentY_TL5 + height };
    let br = { x: b5_startX + widthBottom, y: currentY_TL5 + height + widthBottom*topAngleDrop };
    
    createPlot(id, `Plot ${id}`, 'Plot', area, tl, tr, br, bl, 'Sold', 'East', size);
    currentY_TL5 += height;
};

addB5Plot('4', 28.5, 35.25, 24.5, 638, '35\'3" x 24\'6"');
addB5Plot('3', 35.25, 42.08, 24.5, 774, '42\'1" x 24\'6"');
addB5Plot('2', 42.08, 48.91, 24.5, 910, '48\'11" x 24\'6"');
addB5Plot('1', 48.91, 56.91, 31, 1404, '56\'11" x 31\'0"'); // height is 31

fs.writeFileSync('src/data/plots.json', JSON.stringify(plots, null, 2));
