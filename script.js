const canvas = document.getElementById('tekenCanvas');
const ctx = canvas.getContext('2d');
const textveld = document.getElementById('textveld');
const capsBtn = document.getElementById('capsBtn');
const patroonBtn = document.getElementById('patroonBtn');
const verstuurBtn = document.getElementById('verstuurBtn');
const backspaceBtn = document.getElementById('backspaceBtn');

let tekenen = false;
let sectionWidth, sectionHeight;
let pathSequence = [];
let lastIndex = null;
let laatsteLetter = '';
let letterToegevoegd = false;
let hasMoved = false;
let recentTouch = false;
let huidigPatroonMap = 'letters';
let capsAan = false;
let segments = [];
let lastThreeCells = [];
let activeCharElements = [];
let currentlySelectedChar = null;
let characterHighlightTimeout = null;
let startTime = null;
let startPosition = null;
let isTap = true;
let moveThreshold = 10; // pixels of movement allowed for a tap

const FADE_DURATION = 500;
const HIGHLIGHT_DURATION = 500;
const TAP_DURATION = 300; // milliseconds to count as a tap

const patroonMapLetters = {
  '4': 'e', '2': 'n', '6': 'a', '8': 't', '1': 'i', '3': 'r', '9': 'o', '7': 'd',
  '23': 's', '21': 'l', '41': 'g', '47': 'v', '63': 'h', '69': 'k', '89': 'm', '87': 'u',
  '12': 'b', '14': 'j', '32': 'z', '36': 'p', '96': 'c', '98': 'f', '78': 'w', '74': 'x',
  '45': 'y', '65': 'q', '5': ' ', '56': '.', '54': ',', '52': '?', '58': '!'
};

const patroonMapSymbolen = {
  '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  '12': '0', '14': '@', '21': '(', '23': ')', '25': '[', '32': '+', '36': '-',
  '41': ':', '45': '"', '47': ';', '52': '?', '54': ',', '56': '.', '58': '!',
  '63': '&', '65': "'", '69': '#', '74': '%', '78': '/', '87': '{', '89': '}', '85': ']',
  '96': '=', '98': '\\'
};

// Character to grid position mapping
let charToPosition = {};

// Update the character to position mapping
function updateCharToPosition() {
  charToPosition = {};
  document.querySelectorAll(`.grid-cell[data-mode="${huidigPatroonMap}"]:not([style*="display: none"])`).forEach((cell, cellIndex) => {
    cell.querySelectorAll('.char').forEach(charElement => {
      const letter = charElement.textContent;
      if (letter) {
        charToPosition[letter.toLowerCase()] = {
          cell: cellIndex,
          element: charElement
        };
      }
    });
  });
}

// Update letter case in the grid
function updateLetterCase() {
  document.querySelectorAll('.grid-cell .char').forEach(charElement => {
    const letter = charElement.textContent;
    if (letter && /^[a-z]$/i.test(letter)) {
      charElement.textContent = capsAan ? letter.toUpperCase() : letter.toLowerCase();
    }
  });
  // Update the mapping after changing case
  updateCharToPosition();
}

function resizeCanvas() {
  const container = document.getElementById('canvasContainer');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}

function autoResizeTextarea() {
  textveld.style.height = 'auto';
  textveld.style.height = Math.min(textveld.scrollHeight, 150) + 'px';
  textveld.scrollTop = textveld.scrollHeight;
}

function wisselPatroon() {
  huidigPatroonMap = huidigPatroonMap === 'letters' ? 'symbolen' : 'letters';
  patroonBtn.innerText = huidigPatroonMap === 'letters' ? 'Tekens/Cijfers' : 'Letters';
  
  // Show the current pattern grid and hide the other
  document.querySelectorAll(`.grid-cell[data-mode="letters"]`).forEach(cell => {
    cell.style.display = huidigPatroonMap === 'letters' ? '' : 'none';
  });
  
  document.querySelectorAll(`.grid-cell[data-mode="symbolen"]`).forEach(cell => {
    cell.style.display = huidigPatroonMap === 'symbolen' ? '' : 'none';
  });
  
  // Update the mapping
  updateCharToPosition();
}

function toggleCaps() {
  capsAan = !capsAan;
  capsBtn.innerText = 'Caps: ' + (capsAan ? 'Aan' : 'Uit');
  updateLetterCase();
}

function verstuurTekst() {
  alert("Verzonden: " + textveld.value);
  textveld.value = "";
  autoResizeTextarea();
}

function verwijderLaatste() {
  textveld.value = textveld.value.slice(0, -1);
  autoResizeTextarea();
}

function beginTekenen(x, y) {
  tekenen = true;
  hasMoved = false;
  pathSequence = [];
  lastIndex = getGridIndex(x, y);
  pathSequence.push(lastIndex);
  laatsteLetter = '';
  letterToegevoegd = false;
  ctx.__lastPos = { x, y };
  lastThreeCells = [lastIndex];
  highlightGridCells();
  
  // For tap detection
  startTime = Date.now();
  startPosition = { x, y };
  isTap = true;
  
  // Clear previous character highlight when starting a new gesture
  clearCharHighlights();
  clearTimeout(characterHighlightTimeout);
}

function tekenLijn(x, y) {
  if (!tekenen) return;
  const now = Date.now();
  segments.push({ x1: ctx.__lastPos.x, y1: ctx.__lastPos.y, x2: x, y2: y, time: now });

  // Check if this is still a tap (within movement threshold)
  if (isTap) {
    const dx = x - startPosition.x;
    const dy = y - startPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > moveThreshold) {
      isTap = false;
    }
  }

  const index = getGridIndex(x, y);
  if (index !== lastIndex) {
    pathSequence.push(index);
    lastIndex = index;

    lastThreeCells.push(index);
    if (lastThreeCells.length > 3) lastThreeCells.shift();
    highlightGridCells();

    const code = pathSequence.slice(-2).join('');
    let letter = (huidigPatroonMap === 'letters' ? patroonMapLetters : patroonMapSymbolen)[code];

    if (letter) {
      if (capsAan && /^[a-z]$/.test(letter)) {
        letter = letter.toUpperCase();
      }
      const huidig = textveld.value;
      if (laatsteLetter) {
        textveld.value = huidig.slice(0, -1);
      }
      textveld.value += letter;
      laatsteLetter = letter;
      letterToegevoegd = true;
      
      // Highlight the character in the grid
      highlightCharacter(letter);
      
      // Set timeout to clear highlight after a delay
      clearTimeout(characterHighlightTimeout);
      characterHighlightTimeout = setTimeout(clearCharHighlights, HIGHLIGHT_DURATION);
      
      autoResizeTextarea();
    }
  }

  ctx.__lastPos = { x, y };
  hasMoved = true;
}

function highlightCharacter(letter) {
  // Clear previous highlights
  clearCharHighlights();
  
  // Find the character element
  const lowerLetter = letter === ' ' ? '␣' : letter.toLowerCase();
  
  if (charToPosition[lowerLetter]) {
    const charElement = charToPosition[lowerLetter].element;
    charElement.classList.add('selected-char');
    activeCharElements.push(charElement);
    currentlySelectedChar = letter;
  }
}

function clearCharHighlights() {
  // Remove highlights from all previously highlighted characters
  activeCharElements.forEach(element => {
    element.classList.remove('selected-char');
  });
  activeCharElements = [];
  currentlySelectedChar = null;
}

function stopTekenen() {
  if (!tekenen) return;
  
  const endTime = Date.now();
  const tapDuration = endTime - startTime;
  
  // Check if this was a tap (short duration and minimal movement)
  const wasQuickTap = isTap && tapDuration < TAP_DURATION;
  
  if (wasQuickTap || (!letterToegevoegd && !hasMoved)) {
    // This was a tap or a very short movement
    const code = pathSequence[0].toString();
    let letter = (huidigPatroonMap === 'letters' ? patroonMapLetters : patroonMapSymbolen)[code];
    
    if (letter) {
      if (capsAan && /^[a-z]$/.test(letter)) {
        letter = letter.toUpperCase();
      }
      textveld.value += letter;
      
      // Highlight the character in the grid
      highlightCharacter(letter);
      
      // Set timeout to clear highlight after a delay
      clearTimeout(characterHighlightTimeout);
      characterHighlightTimeout = setTimeout(clearCharHighlights, HIGHLIGHT_DURATION);
      
      autoResizeTextarea();
    }
  }

  tekenen = false;
  ctx.__lastPos = null;

  const allCells = document.querySelectorAll('.grid-cell');
  allCells.forEach(cell => cell.style.backgroundColor = '');
  lastThreeCells = [];

  pathSequence = [];
  laatsteLetter = '';
  letterToegevoegd = false;
  hasMoved = false;
  startTime = null;
  startPosition = null;
  isTap = true;
}

function getGridIndex(x, y) {
  sectionWidth = canvas.width / 3;
  sectionHeight = canvas.height / 3;
  const col = Math.floor(x / sectionWidth);
  const row = Math.floor(y / sectionHeight);
  return row * 3 + col + 1;
}

function highlightGridCells() {
  const allCells = document.querySelectorAll('.grid-cell');
  allCells.forEach(cell => cell.style.backgroundColor = '');

  if (lastThreeCells.length >= 1) {
    const currentCell = document.querySelector(`.grid-cell[data-mode="${huidigPatroonMap}"][data-cell="${lastThreeCells[lastThreeCells.length - 1] - 1}"]`);
    if (currentCell) currentCell.style.backgroundColor = '#ccf2ff'; // Full opacity cyan
  }

  if (lastThreeCells.length >= 2) {
    const prevCell = document.querySelector(`.grid-cell[data-mode="${huidigPatroonMap}"][data-cell="${lastThreeCells[lastThreeCells.length - 2] - 1}"]`);
    if (prevCell) prevCell.style.backgroundColor = '#e6f8ff'; // Full opacity lighter cyan
  }
}

function render() {
  const now = Date.now();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  segments = segments.filter(seg => now - seg.time < FADE_DURATION);

  for (const seg of segments) {
    const age = now - seg.time;
    const alpha = 1 - age / FADE_DURATION;
    ctx.strokeStyle = `rgba(255,0,0,${alpha})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);
    ctx.stroke();
  }

  requestAnimationFrame(render);
}

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

canvas.addEventListener('mousedown', (e) => {
  if (recentTouch) return;
  const pos = getCanvasPos(e);
  beginTekenen(pos.x, pos.y);
});

canvas.addEventListener('mousemove', (e) => {
  const pos = getCanvasPos(e);
  tekenLijn(pos.x, pos.y);
});

canvas.addEventListener('mouseup', stopTekenen);
canvas.addEventListener('mouseleave', stopTekenen);

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  recentTouch = true;
  setTimeout(() => recentTouch = false, 500);
  const touch = e.touches[0];
  const pos = getCanvasPos(touch);
  beginTekenen(pos.x, pos.y);
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const pos = getCanvasPos(touch);
  tekenLijn(pos.x, pos.y);
});

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  stopTekenen();
});

// Only prevent zoom on canvas touches, not on buttons
document.addEventListener('touchstart', function(e) {
  if (e.touches.length > 1 && e.target === canvas) {
    e.preventDefault();
  }
}, { passive: false });

// Set up button events correctly
patroonBtn.addEventListener('click', wisselPatroon);
capsBtn.addEventListener('click', toggleCaps);
verstuurBtn.addEventListener('click', verstuurTekst);
backspaceBtn.addEventListener('click', verwijderLaatste);

window.addEventListener('load', () => {
  resizeCanvas();
  render();
  autoResizeTextarea();
  updateCharToPosition(); // Initialize character mapping on load
});

window.addEventListener('resize', () => {
  resizeCanvas();
});

textveld.addEventListener('input', autoResizeTextarea);