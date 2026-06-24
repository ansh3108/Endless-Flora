const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { alpha: false });
const depthEl = document.getElementById('depth');
const shareEl = document.getElementById('shareUrl');
const toastEl = document.getElementById('toast');
const toastNameEl = document.getElementById('toast-name');

let w, h;
let vy = 0;
let ty = 0;
let currentEpochIndex = -1;
let currentBgHue = 140; 
let toastTimeout;

const spacing = 450;
const epochSize = 15000;
const plantCache = new Map();
const epochCache = new Map();

const adjectives = ["Luminous", "Abyssal", "Crimson", "Crystalline", "Echoing", "Whispering", "Neon", "Fractal", "Obsidian", "Astral", "Verdant", "Ethereal", "Savage", "Serene", "Umbral", "Radiant", "Iridescent"];
const nouns = ["Canopy", "Depths", "Grottos", "Matrix", "Weave", "Thicket", "Spire", "Vents", "Reach", "Domain", "Hollow", "Expanse", "Garden", "Tangle", "Nexus", "Sanctuary", "Ruins"];

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
    ty += e.deltaY * 1.2;
    ty = Math.max(0, ty);
    window.history.replaceState(null, null, `#${Math.floor(ty)}`);
});

shareEl.addEventListener('click', () => {
    shareEl.select();
    navigator.clipboard.writeText(shareEl.value);
});

const prng = a => () => {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    z: Math.random() * 2.5 + 0.5,
    s: Math.random() * 1.5 + 0.5,
    vx: (Math.random() - 0.5) * 0.15,
    vy: (Math.random() - 0.5) * 0.15,
    alpha: Math.random() * 0.5 + 0.1
}));


const generateEpoch = (index) => {
    if (epochCache.has(index)) return epochCache.get(index);

    const seed = index * 99991 + 1; 
    const rng = prng(seed);

    const adj = adjectives[Math.floor(rng() * adjectives.length)];
    const noun = nouns[Math.floor(rng() * nouns.length)];
    const name = index === 0 ? "The Surface" : `${adj} ${noun}`;

    const h = index === 0 ? 140 : Math.floor(rng() * 360);

    let ruleX = "F";
    const branches = Math.floor(rng() * 3) + 1;

    for (let i = 0; i < branches; i++) {
        const sign = rng() > 0.5 ? '+' : '-';
        if (rng() > 0.7) {
            ruleX += `[+X][-X]`; 
        } else {
            const inner = rng() > 0.5 ? "FX" : "X";
            ruleX += `[${sign}${inner}]`; 
        }
        if (rng() > 0.5) ruleX += "F"; 
    }
    ruleX += (rng() > 0.5 ? "+X" : "-X");


    const branchCount = (ruleX.match(/\[/g) || []).length;
    let iters = 5;
    if (branchCount > 2) iters = 4;
    if (branchCount > 4) iters = 3;


    let instructions = "X";
    for (let i = 0; i < iters; i++) {
        let next = "";
        for (let char of instructions) {
            if (char === 'X') next += ruleX;
            else if (char === 'F') next += "FF";
            else next += char;
        }
        instructions = next;
    }

    const epochData = {
        index, name, h,
        angle: 15 + rng() * 25,
        len: 3 + rng() * 6,
        instructions
    };
    
    epochCache.set(index, epochData);
    return epochData;
};

const showToast = (name, colorHue) => {
    toastNameEl.textContent = name;
    toastNameEl.style.textShadow = `0 0 20px hsla(${colorHue}, 100%, 50%, 0.5)`;
    depthEl.style.color = `hsl(${colorHue}, 100%, 75%)`;
    depthEl.style.textShadow = `0 0 12px hsla(${colorHue}, 100%, 50%, 0.4)`;
    
    toastEl.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toastEl.classList.remove('visible'), 3500);
};

const createPlantCanvas = (seed, absoluteY) => {
    const epochIndex = Math.floor(absoluteY / epochSize);
    const epoch = generateEpoch(epochIndex);
    
    const offscreen = document.createElement('canvas');
    const oCtx = offscreen.getContext('2d');
    
    const cWidth = 800;
    const cHeight = 1000;
    offscreen.width = cWidth;
    offscreen.height = cHeight;

    const rng = prng(seed);
    oCtx.translate(cWidth / 2, cHeight - 60);
    oCtx.lineWidth = 1.5;
    oCtx.lineCap = 'round';
    oCtx.shadowBlur = 15;
    oCtx.shadowColor = `hsl(${epoch.h}, 100%, 40%)`;
    
    const angleRad = (epoch.angle + (rng() * 10 - 5)) * (Math.PI / 180);
    const len = epoch.len * (0.8 + rng() * 0.5);
    const colorVariance = rng() * 50;

    const gradient = oCtx.createLinearGradient(0, 0, 0, -cHeight * 0.7);
    gradient.addColorStop(0, `hsla(${epoch.h + colorVariance}, 60%, 20%, 0.9)`);
    gradient.addColorStop(1, `hsla(${epoch.h + colorVariance + 30}, 90%, 75%, 0.9)`);
    oCtx.strokeStyle = gradient;

    for (let char of epoch.instructions) {
        if (char === 'F') {
            oCtx.beginPath();
            oCtx.moveTo(0, 0);
            oCtx.lineTo(0, -len);
            oCtx.stroke();
            oCtx.translate(0, -len);
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

    const activeEpoch = generateEpoch(Math.floor((vy + h/2) / epochSize));
    let hueDiff = activeEpoch.h - currentBgHue;
    if (hueDiff > 180) hueDiff -= 360;
    else if (hueDiff < -180) hueDiff += 360;
    currentBgHue = (currentBgHue + (hueDiff * 0.03) + 360) % 360;

    const bgGradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h));
    bgGradient.addColorStop(0, `hsl(${currentBgHue}, 40%, 8%)`);
    bgGradient.addColorStop(1, '#020203');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);
    
    ctx.globalCompositeOperation = 'screen';
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy - ((ty - vy) * (0.1 / p.z)); 
        
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${currentBgHue}, 80%, 80%, ${p.alpha / p.z})`;
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
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (rng() > 0.2) {
            visibleSeeds.add(seed);
            let cached = plantCache.get(seed);
            if (!cached) {
                cached = createPlantCanvas(seed, absY);
                plantCache.set(seed, cached);
            }
            const x = w * 0.1 + (rng() * w * 0.8);
            ctx.drawImage(cached.canvas, x - (cached.width / 2), screenY - cached.height + 60);
        }
    }


    for (let key of plantCache.keys()) {
        if (!visibleSeeds.has(key)) plantCache.delete(key);
    }
};

const loop = () => {
    vy += (ty - vy) * 0.08;
    depthEl.textContent = Math.floor(vy);
    shareEl.value = `${window.location.href.split('#')[0]}#${Math.floor(ty)}`;
    
    const activeEpochIndex = Math.floor((vy + h / 2) / epochSize);
    if (activeEpochIndex !== currentEpochIndex) {
        currentEpochIndex = activeEpochIndex;
        const epoch = generateEpoch(currentEpochIndex);
        if (vy > 100) showToast(epoch.name, epoch.h);
    }

    if (Math.abs(ty - vy) > 0.1 || particles.length > 0)  {
        render();
    }
    
    requestAnimationFrame(loop);
};

requestAnimationFrame(loop);


