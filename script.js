const canvas = document.getElementById('tekenCanvas');
    const ctx = canvas.getContext('2d');
    const textveld = document.getElementById('textveld');
    const capsBtn = document.getElementById('capsBtn');

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

    const patroonMapLetters = {
      '4': 'e', '2': 'n', '6': 'a', '8': 't', '1': 'i', '3': 'r', '9': 'o', '7': 'd',
      '23': 's', '21': 'l', '41': 'g', '47': 'v', '63': 'h', '69': 'k', '89': 'm', '87': 'u',
      '12': 'b', '14': 'j', '32': 'z', '36': 'p', '96': 'c', '98': 'f', '78': 'w', '74': 'x',
      '45': 'y', '65': 'q', '5': ' ', '56': '.', '54': ',', '52': '?', '58': '!'
    };

    const patroonMapSymbolen = {
    '1': '1', '2': '2', '3': '3',
    '4': '4', '5': '5', '6': '6',
    '7': '7', '8': '8', '9': '9',
    '12': '0',
    '14': '@',
    '21': '(',
    '23': ')',
    '25': '[',
    '32': '+',
    '36': '-',
    '41': ':',
    '45': '"',
    '47': ';',
    '52': '?',
    '54': ',',
    '56': '.',
    '58': '!',
    '63': '&',
    '65': "'",
    '69': '#',
    '74': '%',
    '78': '/', 
    '87': '{',
    '89': '}',
    '85': ']',
    '96': '=',
    '98': '\\'
    };

    function huidigeMap() {
      return huidigPatroonMap === 'letters' ? patroonMapLetters : patroonMapSymbolen;
    }

    function wisselPatroon() {
      huidigPatroonMap = huidigPatroonMap === 'letters' ? 'symbolen' : 'letters';
      drawGrid();
    }

    function toggleCaps() {
      capsAan = !capsAan;
      capsBtn.innerText = 'Caps: ' + (capsAan ? 'Aan' : 'Uit');
      drawGrid();
    }

    function verstuurTekst() {
      alert("Verzonden: " + textveld.value);
      textveld.value = "";
    }

    function verwijderLaatste() {
      textveld.value = textveld.value.slice(0, -1);
    }

    function resizeCanvas() {
      const container = document.getElementById('canvasContainer');
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      drawGrid();
    }

    function drawGrid() {
      sectionWidth = canvas.width / 3;
      sectionHeight = canvas.height / 3;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;

      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * sectionWidth, 0);
        ctx.lineTo(i * sectionWidth, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * sectionHeight);
        ctx.lineTo(canvas.width, i * sectionHeight);
        ctx.stroke();
      }

      drawLetters();
    }

    function getVakMidden(vakIndex) {
      const col = (vakIndex - 1) % 3;
      const row = Math.floor((vakIndex - 1) / 3);
      return {
        x: col * sectionWidth + sectionWidth / 2,
        y: row * sectionHeight + sectionHeight / 2
      };
    }

    function getRichtingOffset(from, to) {
      const fx = (from - 1) % 3;
      const fy = Math.floor((from - 1) / 3);
      const tx = (to - 1) % 3;
      const ty = Math.floor((to - 1) / 3);

      const dx = tx - fx;
      const dy = ty - fy;

      return {
        x: dx * sectionWidth * 0.25,
        y: dy * sectionHeight * 0.25
      };
    }

    function drawLetters() {
      const map = huidigeMap();
      const vakLetters = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [] };

      for (const code in map) {
        let letter = map[code];
        if (capsAan && /^[a-z]$/.test(letter)) {
          letter = letter.toUpperCase();
        }
        const displayChar = (letter === ' ') ? '␣' : letter;
        const startVak = parseInt(code[0]);
        let offset = { x: 0, y: 0 };

        if (code.length === 2) {
          const endVak = parseInt(code[1]);
          offset = getRichtingOffset(startVak, endVak);
        }

        vakLetters[startVak].push({ letter: displayChar, offset });
      }

      ctx.font = `${Math.min(sectionWidth, sectionHeight) * 0.15}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let vak = 1; vak <= 9; vak++) {
        const midden = getVakMidden(vak);
        const entries = vakLetters[vak];

        for (let entry of entries) {
          const isCentered = entry.offset.x === 0 && entry.offset.y === 0;
          ctx.fillStyle = isCentered ? 'red' : 'black';
          ctx.fillText(entry.letter, midden.x + entry.offset.x, midden.y + entry.offset.y);
        }
      }
    }

    function getGridIndex(x, y) {
      const col = Math.floor(x / sectionWidth);
      const row = Math.floor(y / sectionHeight);
      return row * 3 + col + 1;
    }

    function getCanvasPos(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }

    function beginTekenen(x, y) {
      tekenen = true;
      hasMoved = false;
      ctx.beginPath();
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'red';
      ctx.moveTo(x, y);
      pathSequence = [];
      lastIndex = getGridIndex(x, y);
      pathSequence.push(lastIndex);
      laatsteLetter = '';
      letterToegevoegd = false;
    }

    function tekenLijn(x, y) {
      if (!tekenen) return;
      hasMoved = true;
      ctx.lineTo(x, y);
      ctx.stroke();

      const index = getGridIndex(x, y);
      if (index !== lastIndex) {
        pathSequence.push(index);
        lastIndex = index;

        const liveCode = pathSequence.slice(-2).join('');
        const map = huidigeMap();
        let liveLetter = map[liveCode];

        if (liveLetter) {
          if (capsAan && /^[a-z]$/.test(liveLetter)) {
            liveLetter = liveLetter.toUpperCase();
          }
          const huidig = textveld.value;
          if (laatsteLetter) {
            textveld.value = huidig.slice(0, -1);
          }
          textveld.value += liveLetter;
          laatsteLetter = liveLetter;
          letterToegevoegd = true;
        }
      }
    }

    function stopTekenen() {
      tekenen = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGrid();

      if (!letterToegevoegd && !hasMoved) {
        let code = '';
        if (pathSequence.length === 1) {
          code = pathSequence[0].toString();
        } else if (pathSequence.length >= 2) {
          code = pathSequence.slice(-2).join('');
        }

        const map = huidigeMap();
        let letter = map[code];
        if (letter) {
          if (capsAan && /^[a-z]$/.test(letter)) {
            letter = letter.toUpperCase();
          }
          textveld.value += letter;
        }
      }

      pathSequence = [];
      laatsteLetter = '';
      letterToegevoegd = false;
      hasMoved = false;
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

    canvas.addEventListener('touchend', stopTekenen);
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();