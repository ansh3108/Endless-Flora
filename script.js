const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { alpha: false });
const depthEl = document.getElementById('depth');
const shareEl = document.getElementById('shareUrl');

let w, h;
let vy = 0;
let ty = 0;
const spacing = 450;

const plantCache = new Map();

const initHash = parseInt(window.location.hash.replace('#', ''));
if (!isNaN(initHash)) {
    vy = initHash;
    ty = initHash;
}

const resize = () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
};
window.addEventListener('resize', resize);
resize();

window.addEventListener('wheel', e => {
    ty += e.deltaY * 1.5;
    ty = Math.max(0, ty);
    window.history.replaceState(null, null, `#${Math.floor(ty)}`);
});

shareEl.addEventListener('click', () => shareEl.select());

const prng = a => () => {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    s: Math.random() * 1.5 + 0.5,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    alpha: Math.random() * 0.4 + 0.1
}));

const lSystems = {
    rules: {
        'A': 'F[+A][-A]F',
        'F': 'FF',
        'B': 'F-[[B]+B]+F[+FB]-B',
        'X': 'F+[[X]-X]-F[-FX]+X'
    },
    generate: (axiom, iters) => {
        let result = axiom;
        for (let i = 0; i < iters; i++) {
            let next = '';
            for (let char of result) next += lSystems.rules[char] || char;
            result = next;
        }
        return result;
    }
};

const biomes = [
    { d: 0, h: 140, axiom: 'A', iters: 4, len: 10, angle: 25 },
    { d: 15000, h: 280, axiom: 'B', iters: 4, len: 7, angle: 22 },
    { d: 45000, h: 190, axiom: 'X', iters: 5, len: 5, angle: 20 }
];

biomes.forEach(b => {
    b.instructions = lSystems.generate(b.axiom, b.iters);
});

const getBiome = depth => biomes.slice().reverse().find(b => depth >= b.d) || biomes[0];

const createPlantCanvas = (seed, depth) => {
    const offscreen = document.createElement('canvas');
    const oCtx = offscreen.getContext('2d');
    
    const cWidth = 600;
    const cHeight = 800;
    offscreen.width = cWidth;
    offscreen.height = cHeight;

    const rng = prng(seed);
    const biome = getBiome(depth);
    
    oCtx.translate(cWidth / 2, cHeight - 20); 
    oCtx.lineWidth = 2;
    oCtx.lineCap = 'round';
    oCtx.shadowBlur = 12;
    oCtx.shadowColor = `hsl(${biome.h}, 100%, 50%)`;
    
    const angleRad = (biome.angle + (rng() * 8 - 4)) * (Math.PI / 180);
    const len = biome.len * (0.8 + rng() * 0.5);
    
    let step = 0;
    const colorVariance = rng() * 60;

    for (let char of biome.instructions) {
        if (char === 'F') {
            oCtx.beginPath();
            oCtx.moveTo(0, 0);
            oCtx.lineTo(0, -len);
            
            const currentHue = biome.h + (step * 1.2) + colorVariance;
            oCtx.strokeStyle = `hsla(${currentHue}, 85%, 65%, 0.9)`;
            oCtx.stroke();
            
            oCtx.translate(0, -len);
            step++;
        } else if (char === '+') {
            oCtx.rotate(angleRad);
        } else if (char === '-') {
            oCtx.rotate(-angleRad);
        } else if (char === '[') {
            oCtx.save();
        } else if (char === ']') {
            oCtx.restore();
        }
    }
    
    return { canvas: offscreen, width: cWidth, height: cHeight };
};

const render = () => {
    ctx.fillStyle = '#07080c';
    ctx.fillRect(0, 0, w, h);
    
    ctx.globalCompositeOperation = 'screen';
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy - ((ty - vy) * 0.2); 
        
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.fill();
    });
    
    ctx.globalCompositeOperation = 'source-over'; 

    const sIdx = Math.floor(vy / spacing);
    const eIdx = Math.ceil((vy + h) / spacing);
    const visibleSeeds = new Set();

    for (let i = sIdx; i <= eIdx; i++) {
        const absY = i * spacing;
        const screenY = absY - vy;
        const seed = i * 8675309;
        const rng = prng(seed);
        
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(w, screenY);
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (rng() > 0.15) {
            visibleSeeds.add(seed);
            
            let cached = plantCache.get(seed);
            if (!cached) {
                cached = createPlantCanvas(seed, absY);
                plantCache.set(seed, cached);
            }

            const x = w * 0.15 + (rng() * w * 0.7);
            ctx.drawImage(cached.canvas, x - (cached.width / 2), screenY - cached.height + 20);
        }
    }

    for (let key of plantCache.keys()) {
        if (!visibleSeeds.has(key)) {
            plantCache.delete(key);
        }
    }
};

const loop = () => {
    vy += (ty - vy) * 0.08;
    depthEl.textContent = Math.floor(vy);
    shareEl.value = `${window.location.href.split('#')[0]}#${Math.floor(ty)}`;
    
    render();
    requestAnimationFrame(loop);
};

requestAnimationFrame(loop);



