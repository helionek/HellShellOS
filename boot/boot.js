class BootManager {
    constructor() {
        this.bootMessages = [
            {text: 'Initializing bootloader...', delay: 800},
            {text: 'Loading kernel 5.15.0...', delay: 700},
            {text: 'Mounting root filesystem...', delay: 600},
            {text: 'Starting system services...', delay: 900},
            {text: 'Configuring network interfaces...', delay: 750},
            {text: 'Loading security modules...', delay: 650},
            {text: 'Starting user session...', delay: 800},
            {text: 'Boot complete. Starting setup wizard...', delay: 600}
        ];

        this.setupQuestions = [
            {
                question: "Welcome to HellShellOS Setup",
                key: "welcome",
                type: "confirm"
            },
            {
                question: "Enter your username:",
                key: "username",
                type: "text",
                placeholder: "john_doe",
                validate: (input) => {
                    if (input.length < 3) return "Username must be at least 3 characters";
                    if (input.length > 20) return "Username must be less than 20 characters";
                    if (!/^[a-zA-Z0-9_-]+$/.test(input)) return "Username can only contain letters, numbers, underscores and hyphens";
                    return true;
                }
            },
            {
                question: "Choose your theme (optional):",
                key: "theme",
                type: "select",
                options: ["dark", "light", "auto"]
            },
            {
                question: "Preferred color scheme (optional):",
                key: "colorScheme",
                type: "select",
                options: ["blue", "green", "purple", "red", "amber"]
            },
            {
                question: "Allocate storage space (GB):",
                key: "storageAllocation",
                type: "number",
                placeholder: "10",
                min: 5,
                max: 100,
                validate: (input) => {
                    const value = parseInt(input);
                    if (value < 5) return "Minimum storage allocation is 5GB";
                    if (value > 100) return "Maximum storage allocation is 100GB";
                    return true;
                }
            },
            {
                question: "Allocate RAM (GB):",
                key: "ramAllocation",
                type: "number",
                placeholder: "4",
                min: 2,
                max: 32,
                validate: (input) => {
                    const value = parseInt(input);
                    if (value < 2) return "Minimum RAM allocation is 2GB";
                    if (value > 32) return "Maximum RAM allocation is 32GB";
                    return true;
                }
            },
            {
                question: "Enable GPU acceleration (optional):",
                key: "gpuAcceleration",
                type: "confirm",
                default: true
            },
            {
                question: "Auto-start services (optional):",
                key: "autoStart",
                type: "select",
                options: ["minimal", "standard", "full"]
            }
        ];

        this.elements = {
            log: document.getElementById('log'),
            bar: document.getElementById('bar'),
            percent: document.getElementById('percent'),
            stage: document.getElementById('stage'),
            uptime: document.getElementById('uptime'),
            phase: document.getElementById('phase'),
            currentTime: document.getElementById('current-time')
        };

        this.state = {
            running: false,
            currentBootStep: 0,
            currentSetupStep: 0,
            startTime: 0,
            userConfig: {}
        };

        this.timers = [];
        this.intervals = [];
    }

    init() {
        this.updateTime();
        this.intervals.push(setInterval(() => this.updateTime(), 1000));
        this.runBootSequence();
    }

    updateTime() {
        const now = new Date();
        this.elements.currentTime.textContent = now.toLocaleTimeString('en-US', {hour12: false});
    }

    async typeText(text, speed = 20) {
        return new Promise(resolve => {
            const lineEl = document.createElement('div');
            lineEl.className = 'line';
            
            const promptEl = document.createElement('span');
            promptEl.className = 'prompt';
            promptEl.textContent = '$';
            
            const textEl = document.createElement('span');
            textEl.className = 'text';
            
            lineEl.appendChild(promptEl);
            lineEl.appendChild(textEl);
            this.elements.log.appendChild(lineEl);
            
            let i = 0;
            
            const step = () => {
                if (i < text.length) {
                    textEl.textContent += text.charAt(i);
                    i++;
                    this.scrollToBottom();
                    this.timers.push(setTimeout(step, speed + Math.random() * 10));
                } else {
                    resolve();
                }
            };
            
            step();
        });
    }

    showError(message) {
        const errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.textContent = `Error: ${message}`;
        this.elements.log.appendChild(errorEl);
        this.scrollToBottom();
        
        setTimeout(() => {
            if (errorEl.parentNode) {
                errorEl.remove();
            }
        }, 3000);
    }

    async createInputLine(question) {
        return new Promise((resolve) => {
            const inputLine = document.createElement('div');
            inputLine.className = 'input-line';
            
            const prompt = document.createElement('span');
            prompt.className = 'input-prompt';
            prompt.textContent = '>';
            
            const input = document.createElement('input');
            input.className = 'input-field';
            input.type = question.type === 'number' ? 'number' : 'text';
            input.placeholder = question.placeholder || '';
            input.min = question.min;
            input.max = question.max;
            
            if (question.type === 'select') {
                input.placeholder = `Options: ${question.options.join(', ')} (optional)`;
            }
            
            inputLine.appendChild(prompt);
            inputLine.appendChild(input);
            this.elements.log.appendChild(inputLine);
            
            this.scrollToBottom();
            input.focus();
            
            const handleInput = (e) => {
                if (e.key === 'Enter') {
                    const value = input.value.trim();
                    
                    if (question.type === 'confirm' && value === '') {
                        input.removeEventListener('keypress', handleInput);
                        inputLine.remove();
                        this.state.userConfig[question.key] = true;
                        this.showInputResponse(question, '');
                        resolve();
                        return;
                    }
                    
                    const requiredFields = ['username', 'storageAllocation', 'ramAllocation'];
                    const isRequired = requiredFields.includes(question.key);
                    
                    if (value === '' && isRequired) {
                        this.showError('This field is required');
                        return;
                    }
                    
                    if (question.validate && value !== '' && isRequired) {
                        const validationResult = question.validate(value);
                        if (validationResult !== true) {
                            this.showError(validationResult);
                            return;
                        }
                    }
                    
                    input.removeEventListener('keypress', handleInput);
                    inputLine.remove();
                    
                    this.storeAnswer(question, value);
                    this.showInputResponse(question, value);
                    resolve();
                }
            };
            
            input.addEventListener('keypress', handleInput);
        });
    }

    storeAnswer(question, value) {
        if (question.type === 'confirm') {
            this.state.userConfig[question.key] = true;
        } else if (question.type === 'number') {
            this.state.userConfig[question.key] = parseInt(value) || 0;
        } else {
            this.state.userConfig[question.key] = value || question.options?.[0] || '';
        }
    }

    showInputResponse(question, value) {
        const responseLine = document.createElement('div');
        responseLine.className = 'line';
        
        const displayValue = value || (question.type === 'confirm' ? '' : question.options?.[0] || '');
        responseLine.innerHTML = `<span class="prompt">$</span><span class="text">${displayValue}</span>`;
        this.elements.log.appendChild(responseLine);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.elements.log.parentElement.scrollTop = this.elements.log.parentElement.scrollHeight;
    }

    updateProgress() {
        const totalSteps = this.bootMessages.length + this.setupQuestions.length;
        const currentStep = this.state.currentBootStep + this.state.currentSetupStep;
        const pct = Math.round((currentStep / totalSteps) * 100);
        
        this.elements.bar.style.width = pct + '%';
        this.elements.percent.textContent = pct + '%';
    }

    async runBootSequence() {
        if (this.state.running) return;
        
        this.state.running = true;
        this.state.startTime = Date.now();
        
        this.elements.phase.textContent = 'Booting';
        this.updateProgress();
        
        this.intervals.push(setInterval(() => {
            const uptime = Math.floor((Date.now() - this.state.startTime) / 1000);
            this.elements.uptime.textContent = `${uptime}s`;
        }, 1000));
        
        for (let i = 0; i < this.bootMessages.length; i++) {
            const message = this.bootMessages[i];
            this.elements.stage.textContent = message.text.replace(/\.\.\.$/, '');
            await this.typeText(message.text, 18);
            this.state.currentBootStep = i + 1;
            this.updateProgress();
            await this.delay(message.delay);
        }
        
        await this.runSetupWizard();
    }

    async runSetupWizard() {
        this.elements.phase.textContent = 'Setup';
        this.elements.stage.textContent = 'System Configuration';
        
        await this.delay(500);
        
        for (let i = 0; i < this.setupQuestions.length; i++) {
            const question = this.setupQuestions[i];
            this.state.currentSetupStep = i + 1;
            this.updateProgress();
            
            await this.typeText(question.question, 15);
            await this.createInputLine(question);
            await this.delay(200);
        }
        
        await this.finalizeSetup();
    }

    async finalizeSetup() {
        this.state.currentSetupStep = this.setupQuestions.length;
        this.updateProgress();
        
        await this.typeText('\nSetup complete!', 10);
        await this.typeText(`Welcome to HellShellOS, ${this.state.userConfig.username || 'User'}!`, 10);
        await this.typeText('Initializing main system...', 10);
        
        this.elements.stage.textContent = 'Complete';
        this.elements.phase.textContent = 'Ready';
        
        await this.delay(2000);
        
        sessionStorage.setItem('hellshell-user-config', JSON.stringify(this.state.userConfig));
        window.location.href = 'main/main.html';
    }

    delay(ms) {
        return new Promise(resolve => {
            this.timers.push(setTimeout(resolve, ms));
        });
    }

    destroy() {
        this.timers.forEach(timer => clearTimeout(timer));
        this.intervals.forEach(interval => clearInterval(interval));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const bootManager = new BootManager();
    bootManager.init();
});
