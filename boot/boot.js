const messages = [
    {text: 'Initializing bootloader...', delay: 800},
    {text: 'Loading kernel 5.15.0...', delay: 700},
    {text: 'Mounting root filesystem...', delay: 600},
    {text: 'Starting system services...', delay: 900},
    {text: 'Configuring network interfaces...', delay: 750},
    {text: 'Loading security modules...', delay: 650},
    {text: 'Starting user session...', delay: 800},
    {text: 'Boot complete. Welcome to HellShellOS.', delay: 600}
    
];

const logEl = document.getElementById('log');
const bar = document.getElementById('bar');
const percentEl = document.getElementById('percent');
const etaEl = document.getElementById('eta');
const stageEl = document.getElementById('stage');
const uptimeEl = document.getElementById('uptime');
const currentTimeEl = document.getElementById('current-time');

let running = false;
let current = 0;
let startTime = 0;
let timers = [];
let uptimeInterval;
let timeInterval;

// Update current time
function updateTime() {
    const now = new Date();
    currentTimeEl.textContent = now.toLocaleTimeString('en-US', {hour12: false});
}

function typeText(text, speed = 20) {
    return new Promise(resolve => {
        let lineEl = document.createElement('div');
        lineEl.className = 'line';
        
        let promptEl = document.createElement('span');
        promptEl.className = 'prompt';
        promptEl.textContent = '$';
        
        let textEl = document.createElement('span');
        textEl.className = 'text';
        
        let cursorEl = document.createElement('span');
        cursorEl.className = 'cursor';
        
        lineEl.appendChild(promptEl);
        lineEl.appendChild(textEl);
        lineEl.appendChild(cursorEl);
        logEl.appendChild(lineEl);
        
        let i = 0;
        
        function step() {
            if (i < text.length) {
                textEl.textContent += text.charAt(i);
                i++;
                logEl.parentElement.scrollTop = logEl.parentElement.scrollHeight;
                timers.push(setTimeout(step, speed + Math.random() * 10));
            } else {
                cursorEl.remove();
                resolve();
            }
        }
        
        step();
    });
}

async function run() {
    if (running) return;
    
    running = true;
    current = 0;
    logEl.textContent = '';
    startTime = Date.now();
    
    // Start timers
    updateTime();
    timeInterval = setInterval(updateTime, 1000);
    uptimeInterval = setInterval(() => {
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        uptimeEl.textContent = `${uptime}s`;
    }, 1000);
    
    update();
    
    for (let m of messages) {
        stageEl.textContent = m.text.replace(/\.\.\.$/, '');
        await typeText(m.text, 18);
        current++;
        update();
        await new Promise(res => {
            let t = setTimeout(res, m.delay);
            timers.push(t);
        });
    }
    
    running = false;
    clearInterval(uptimeInterval);
}

function update() {
    let pct = Math.round((current / messages.length) * 100);
    bar.style.width = pct + '%';
    percentEl.textContent = pct + '%';
    
    let elapsed = (Date.now() - startTime) || 1;
    let avg = elapsed / Math.max(current, 1);
    let remaining = Math.round((messages.length - current) * avg / 1000);
    etaEl.textContent = `${remaining}s`;
}

// Start the boot sequence
run();