const BackgroundAnimation = {
    init() {
        const canvas = document.getElementById('login-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        let satellites = [];

        const resize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        // Node structure
        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.radius = Math.random() * 1.5 + 0.5;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
                ctx.fill();
            }
        }

        // Satellite structure (Shooting light passing by)
        class Satellite {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() < 0.5 ? -100 : width + 100;
                this.y = Math.random() * height;
                this.vx = (this.x < 0 ? 1 : -1) * (Math.random() * 2 + 1);
                this.vy = (Math.random() - 0.5);
                this.size = Math.random() * 2 + 1;
                this.tailLength = Math.random() * 50 + 50;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x > width + 200 || this.x < -200 || this.y > height + 200 || this.y < -200) {
                    this.reset();
                }
            }

            draw() {
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x - this.vx * this.tailLength, this.y - this.vy * this.tailLength);
                
                const grad = ctx.createLinearGradient(this.x, this.y, this.x - this.vx * this.tailLength, this.y - this.vy * this.tailLength);
                grad.addColorStop(0, 'rgba(139, 92, 246, 0.8)'); // Purple glow
                grad.addColorStop(1, 'rgba(139, 92, 246, 0)');
                
                ctx.strokeStyle = grad;
                ctx.lineWidth = this.size;
                ctx.stroke();
                
                // Head
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
            }
        }

        for (let i = 0; i < 60; i++) particles.push(new Particle());
        for (let i = 0; i < 3; i++) satellites.push(new Satellite());

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Update and draw particles (nodes)
            particles.forEach((p, index) => {
                p.update();
                p.draw();
                
                // Lines between close nodes
                for (let j = index + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(59, 130, 246, ${1 - dist / 120})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            });

            // Update and draw satellites
            satellites.forEach(s => {
                s.update();
                s.draw();
            });

            requestAnimationFrame(animate);
        };

        animate();
    }
};
