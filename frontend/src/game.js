
import Phaser from "phaser";
import yazdLogoUrl from "../assets/yazd-logo.png";

class FactoryRunner extends Phaser.Scene {
    constructor() {
        super("FactoryRunner");
    }

    preload() {
        this.load.image("yazd-logo", yazdLogoUrl);
    }

    create() {
        this.W = 960;
        this.H = 540;
        this.groundY = 455;

        this.score = 0;
        this.lastScoreDisplay = -1;
        this.tiresCollected = 0;
        this.speed = 330;
        this.elapsed = 0;
        this.state = "playing";

        this.audioContext = null;
        this.masterGain = null;
        this.musicTimer = null;
        this.audioReady = false;
        this.soundEnabled = true;
        this.musicEnabled = true;
        this.volume = 0.35;
        this.musicStep = 0;

        this.exitMenuObjects = [];

        this.createBackground();
        this.createIndustrialDetails();
        this.createFactoryMachines();
        this.createConveyor();
        this.createGround();
        this.createPlayer();
        this.createForklift();
        this.createTireStacks();

        this.obstacles = this.physics.add.group();
        this.tires = this.physics.add.group();

        this.physics.add.collider(this.player, this.ground);

        this.physics.add.overlap(
            this.player,
            this.obstacles,
            this.hitObstacle,
            null,
            this
        );

        this.physics.add.overlap(
            this.player,
            this.tires,
            this.collectTire,
            null,
            this
        );

        this.createHUD();
        this.createAudioControls();
        this.createControls();
        this.createAmbientEffects();

        this.obstacleTimer = this.time.addEvent({
            delay: 1700,
            callback: this.spawnObstacle,
            callbackScope: this,
            loop: true
        });

        this.tireTimer = this.time.addEvent({
            delay: 1250,
            callback: this.spawnTire,
            callbackScope: this,
            loop: true
        });

        this.events.once("shutdown", () => {
            this.stopMusic();

            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
        });
    }

    createBackground() {
        const g = this.add.graphics();

        g.fillGradientStyle(
            0x263744, 0x263744,
            0x17232d, 0x17232d, 1
        );
        g.fillRect(0, 0, this.W, 455);

        g.fillStyle(0x111b23, 1);
        g.fillRect(0, 0, this.W, 55);

        g.lineStyle(5, 0x60717d, 0.8);

        for (let x = 0; x < this.W; x += 160) {
            g.lineBetween(x, 55, x + 100, 0);
        }

        for (let x = 40; x < this.W; x += 190) {
            g.fillStyle(0x6c9eaf, 0.18);
            g.fillRect(x, 75, 105, 95);

            g.lineStyle(3, 0x8ba2ae, 0.8);
            g.strokeRect(x, 75, 105, 95);
            g.lineBetween(x + 52, 75, x + 52, 170);
            g.lineBetween(x, 122, x + 105, 122);
        }

        for (let x = 10; x < this.W; x += 190) {
            g.fillStyle(0x394b57, 1);
            g.fillRect(x, 55, 17, 400);
            g.fillStyle(0x647783, 0.45);
            g.fillRect(x + 3, 55, 4, 400);
        }

        for (let x = 90; x < this.W; x += 220) {
            g.fillStyle(0xffe6a0, 0.12);
            g.fillEllipse(x, 65, 100, 45);
            g.fillStyle(0xffe4a0, 1);
            g.fillRoundedRect(x - 25, 53, 50, 8, 3);
        }

        g.lineStyle(10, 0x52636d, 1);
        g.lineBetween(0, 205, this.W, 205);

        g.lineStyle(3, 0x91a0a7, 0.7);
        g.lineBetween(0, 201, this.W, 201);

        g.fillStyle(0x17232c, 1);
        g.fillRoundedRect(360, 85, 245, 48, 8);

        g.lineStyle(2, 0xffa52f, 1);
        g.strokeRoundedRect(360, 85, 245, 48, 8);

        this.add.text(482, 109, "YAZD TIRE FACTORY", {
            fontFamily: "Arial",
            fontSize: "17px",
            fontStyle: "bold",
            color: "#f4a340"
        }).setOrigin(0.5);
    }

    createIndustrialDetails() {
        const g = this.add.graphics();

        for (let x = 120; x < this.W; x += 240) {
            g.lineStyle(12, 0x53646e, 1);
            g.lineBetween(x, 180, x, 430);
            g.lineStyle(3, 0x9baab1, 0.7);
            g.lineBetween(x - 3, 180, x - 3, 430);
        }

        for (let x = 75; x < this.W; x += 300) {
            g.fillStyle(0x344954, 1);
            g.fillRoundedRect(x, 245, 55, 75, 5);
            g.lineStyle(2, 0x8b9ca5, 1);
            g.strokeRoundedRect(x, 245, 55, 75, 5);

            g.fillStyle(0x1c2930, 1);
            g.fillRect(x + 8, 258, 39, 27);

            g.fillStyle(0x43d17b, 1);
            g.fillCircle(x + 15, 300, 4);
            g.fillStyle(0xffbf43, 1);
            g.fillCircle(x + 35, 300, 4);
        }

        g.lineStyle(5, 0x89959a, 0.8);
        g.lineBetween(0, 385, this.W, 385);

        for (let x = 0; x < this.W; x += 80) {
            g.lineBetween(x, 385, x, 425);
        }

        this.warningLight = this.add.circle(870, 235, 9, 0xff3030);

        this.tweens.add({
            targets: this.warningLight,
            alpha: 0.2,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    createFactoryMachines() {
        for (let i = 0; i < 4; i++) {
            this.createPress(100 + i * 245, 300);
        }
    }

    createPress(x, y) {
        const container = this.add.container(x, y);
        const body = this.add.graphics();

        body.fillStyle(0x344854, 1);
        body.fillRoundedRect(-57, -90, 114, 170, 8);
        body.lineStyle(4, 0x82939d, 1);
        body.strokeRoundedRect(-57, -90, 114, 170, 8);

        body.fillStyle(0x1b2a33, 1);
        body.fillRoundedRect(-43, -70, 86, 112, 5);

        body.fillStyle(0x9ba8ae, 1);
        body.fillRect(-48, -82, 9, 145);
        body.fillRect(39, -82, 9, 145);

        body.fillStyle(0x71818a, 1);
        body.fillRoundedRect(-48, -90, 96, 18, 3);

        body.fillStyle(0x18252c, 1);
        body.fillRect(-70, 75, 140, 13);

        body.fillStyle(0xd0d6d9, 1);

        for (const px of [-45, 45]) {
            for (const py of [-78, 65]) {
                body.fillCircle(px, py, 4);
            }
        }

        body.fillStyle(0x0b171d, 1);
        body.fillRoundedRect(-29, -52, 58, 24, 3);

        body.fillStyle(0x35d68b, 1);
        body.fillRect(-22, -45, 44, 9);

        body.fillStyle(0x35cf77, 1);
        body.fillCircle(-25, 22, 5);
        body.fillStyle(0xe84b3c, 1);
        body.fillCircle(0, 22, 5);
        body.fillStyle(0xffc247, 1);
        body.fillCircle(25, 22, 5);

        body.lineStyle(12, 0x111719, 1);
        body.strokeCircle(0, 48, 23);
        body.lineStyle(3, 0x555d60, 1);
        body.strokeCircle(0, 48, 15);

        container.add(body);

        const light = this.add.circle(0, -104, 7, 0x3be17f);
        container.add(light);

        const plate = this.add.rectangle(0, -82, 95, 8, 0xa8b4ba);
        container.add(plate);

        this.tweens.add({
            targets: plate,
            y: -72,
            duration: 1800 + Math.random() * 800,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        this.tweens.add({
            targets: light,
            alpha: 0.3,
            duration: 650,
            yoyo: true,
            repeat: -1
        });
    }

    createConveyor() {
        const g = this.add.graphics();

        g.fillStyle(0x202a30, 1);
        g.fillRoundedRect(0, 395, this.W, 35, 5);

        g.lineStyle(3, 0x75858d, 1);
        g.strokeRoundedRect(0, 395, this.W, 35, 5);

        this.conveyorRollers = [];

        for (let x = 15; x < this.W; x += 45) {
            const roller = this.add.circle(x, 412, 10, 0x596a73);
            roller.setStrokeStyle(2, 0x9aa8ae);
            this.conveyorRollers.push(roller);
        }

        this.conveyorLines = [];

        for (let x = 0; x < this.W; x += 90) {
            this.conveyorLines.push(
                this.add.rectangle(x, 395, 32, 3, 0xb7c2c8)
            );
        }
    }

    createGround() {
        const g = this.add.graphics();

        g.fillGradientStyle(
            0x59656b, 0x59656b,
            0x303b40, 0x303b40, 1
        );
        g.fillRect(0, 455, this.W, 85);

        g.lineStyle(1, 0x879197, 0.18);

        for (let x = 0; x < this.W; x += 55) {
            g.lineBetween(x, 455, x - 25, 540);
        }

        for (let y = 475; y < 540; y += 24) {
            g.lineBetween(0, y, this.W, y);
        }

        for (let x = 0; x < this.W; x += 55) {
            g.fillStyle(0xf1b42f, 1);
            g.fillRect(x, 455, 27, 7);
            g.fillStyle(0x22292c, 1);
            g.fillRect(x + 27, 455, 27, 7);
        }

        this.ground = this.add.rectangle(
            this.W / 2, 498, this.W, 86, 0x303b40
        );

        this.physics.add.existing(this.ground, true);
    }

    createPlayer() {
        this.player = this.add.container(155, 410);

        this.playerShadow = this.add.ellipse(
            0, 44, 52, 13, 0x000000, 0.32
        );
        this.player.add(this.playerShadow);

        const legs = this.add.graphics();

        legs.fillStyle(0x111820, 1);
        legs.fillRoundedRect(-18, 20, 15, 39, 5);
        legs.fillRoundedRect(3, 20, 15, 39, 5);

        legs.fillStyle(0x151719, 1);
        legs.fillRoundedRect(-23, 52, 23, 10, 4);
        legs.fillRoundedRect(0, 52, 23, 10, 4);

        this.player.add(legs);

        const body = this.add.graphics();

        body.fillStyle(0x172b46, 1);
        body.fillRoundedRect(-23, -20, 46, 48, 8);

        body.fillStyle(0xf18a25, 1);
        body.fillRoundedRect(-23, -20, 46, 17, 6);
        body.fillRect(-23, -10, 46, 7);

        body.fillStyle(0x17202a, 1);
        body.fillTriangle(-8, -20, 8, -20, 0, -9);

        body.fillStyle(0x243e59, 1);
        body.fillRoundedRect(-18, -1, 14, 15, 2);

        body.lineStyle(1, 0x9caab3, 0.8);
        body.strokeRoundedRect(-18, -1, 14, 15, 2);

        this.player.add(body);

        // لوگوی بارگذاری‌شده در preload
        this.playerLogo = this.add.image(-11, 6, "yazd-logo");
        this.playerLogo.setDisplaySize(10, 10);
        this.player.add(this.playerLogo);

        const arms = this.add.graphics();

        arms.lineStyle(9, 0xf18a25, 1);
        arms.lineBetween(-21, -11, -31, 12);
        arms.lineBetween(21, -11, 31, 12);

        arms.fillStyle(0xe0a477, 1);
        arms.fillCircle(-31, 13, 5);
        arms.fillCircle(31, 13, 5);

        this.player.add(arms);

        const neck = this.add.rectangle(0, -23, 12, 12, 0xd89c70);
        this.player.add(neck);

        const head = this.add.ellipse(0, -39, 32, 37, 0xe7ad80);
        head.setStrokeStyle(2, 0x9c6d4f);
        this.player.add(head);

        const hair = this.add.graphics();

        hair.fillStyle(0x252323, 1);
        hair.fillRoundedRect(-16, -59, 32, 12, 5);
        hair.fillRect(-16, -51, 6, 8);
        hair.fillRect(10, -51, 6, 8);

        this.player.add(hair);

        const eyes = this.add.graphics();

        eyes.fillStyle(0x222222, 1);
        eyes.fillCircle(-6, -40, 2);
        eyes.fillCircle(6, -40, 2);

        eyes.lineStyle(2, 0x854b39, 1);
        eyes.beginPath();
        eyes.arc(0, -32, 6, 0.15, Math.PI - 0.15, false);
        eyes.strokePath();

        this.player.add(eyes);

        this.physics.add.existing(this.player);

        this.player.body.setSize(42, 78);
        this.player.body.setOffset(-21, -8);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setGravityY(1100);

        this.player.setDepth(20);

        this.playerRunTween = this.tweens.add({
            targets: [legs, arms],
            angle: { from: -8, to: 8 },
            duration: 180,
            yoyo: true,
            repeat: -1
        });
    }

    createForklift() {
        this.forklift = this.add.container(785, 365);

        const g = this.add.graphics();

        g.fillStyle(0x000000, 0.25);
        g.fillEllipse(0, 72, 130, 18);

        g.fillStyle(0xe9a522, 1);
        g.fillRoundedRect(-55, 5, 90, 45, 8);

        g.lineStyle(3, 0x704c17, 1);
        g.strokeRoundedRect(-55, 5, 90, 45, 8);

        g.fillStyle(0x273b47, 1);
        g.fillRoundedRect(-22, -32, 48, 45, 5);

        g.fillStyle(0x8bc1d5, 0.75);
        g.fillRoundedRect(-15, -26, 34, 27, 3);

        g.fillStyle(0xe6a01d, 1);
        g.fillRect(-27, -38, 58, 7);

        g.fillStyle(0x111719, 1);
        g.fillCircle(-32, 50, 15);
        g.fillCircle(22, 50, 15);

        g.lineStyle(3, 0x8d989c, 1);
        g.strokeCircle(-32, 50, 9);
        g.strokeCircle(22, 50, 9);

        g.fillStyle(0x929da1, 1);
        g.fillRect(38, -35, 7, 92);

        g.fillStyle(0xadb8bd, 1);
        g.fillRect(40, 38, 60, 6);
        g.fillRect(40, 52, 60, 6);

        g.fillStyle(0xffe35b, 1);
        g.fillCircle(-36, 17, 5);

        this.forklift.add(g);
        this.forklift.setDepth(5);
    }

    createTireStacks() {
        for (let i = 0; i < 3; i++) {
            this.drawTireStack(580 + i * 140, 380, 3);
        }
    }

    drawTireStack(x, y, count) {
        const container = this.add.container(x, y);

        for (let i = 0; i < count; i++) {
            const tire = this.add.graphics();

            tire.lineStyle(12, 0x111416, 1);
            tire.strokeCircle(0, -i * 17, 23);

            tire.lineStyle(3, 0x50595c, 1);
            tire.strokeCircle(0, -i * 17, 17);

            tire.lineStyle(2, 0x24292b, 1);
            tire.strokeCircle(0, -i * 17, 11);

            tire.lineStyle(2, 0x596064, 0.8);

            for (let a = 0; a < 8; a++) {
                const angle = a * Math.PI / 4;

                tire.lineBetween(
                    Math.cos(angle) * 18,
                    -i * 17 + Math.sin(angle) * 18,
                    Math.cos(angle) * 24,
                    -i * 17 + Math.sin(angle) * 24
                );
            }

            container.add(tire);
        }
    }

    createHUD() {
        const panel = this.add.graphics();

        panel.fillStyle(0x101b24, 0.88);
        panel.fillRoundedRect(15, 12, 265, 75, 10);
        panel.lineStyle(2, 0xf1a333, 0.8);
        panel.strokeRoundedRect(15, 12, 265, 75, 10);
        panel.setDepth(100);

        this.scoreText = this.add.text(32, 23, "امتیاز: ۰", {
            fontFamily: "Tahoma",
            fontSize: "20px",
            fontStyle: "bold",
            color: "#ffffff"
        }).setDepth(101);

        this.tireText = this.add.text(32, 54, "لاستیک: ۰", {
            fontFamily: "Tahoma",
            fontSize: "16px",
            color: "#ffd36b"
        }).setDepth(101);

        this.add.text(480, 18, "YAZD TIRE GAME CLUB", {
            fontFamily: "Arial",
            fontSize: "18px",
            fontStyle: "bold",
            color: "#f5a52f"
        }).setOrigin(0.5).setDepth(100);

        this.exitButton = this.add.text(850, 485, "خروج از بازی", {
            fontFamily: "Tahoma",
            fontSize: "16px",
            fontStyle: "bold",
            color: "#ffffff",
            backgroundColor: "#b83232",
            padding: { x: 12, y: 8 }
        }).setOrigin(0.5)
          .setDepth(120)
          .setInteractive({ useHandCursor: true });

        this.exitButton.on("pointerdown", () => this.exitGame());
    }

    updateHUD() {
        const toPersian = value =>
            String(value).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);

        this.scoreText.setText(
            "امتیاز: " + toPersian(Math.floor(this.score))
        );

        this.tireText.setText(
            "لاستیک: " + toPersian(this.tiresCollected)
        );
    }

    createAudioControls() {
        this.audioPanel = this.add.container(820, 22);
        this.audioPanel.setDepth(110);

        const panel = this.add.graphics();

        panel.fillStyle(0x101b24, 0.9);
        panel.fillRoundedRect(-105, -5, 125, 58, 8);
        panel.lineStyle(1, 0x82939d, 0.7);
        panel.strokeRoundedRect(-105, -5, 125, 58, 8);

        this.audioPanel.add(panel);

        this.soundButton = this.add.text(-92, 5, "🔊 صدا", {
            fontFamily: "Tahoma",
            fontSize: "13px",
            color: "#ffffff",
            backgroundColor: "#344b5b",
            padding: { x: 7, y: 5 }
        }).setInteractive({ useHandCursor: true });

        this.audioPanel.add(this.soundButton);

        this.soundButton.on("pointerdown", () => {
            this.soundEnabled = !this.soundEnabled;

            this.soundButton.setText(
                this.soundEnabled ? "🔊 صدا" : "🔇 بی‌صدا"
            );

            this.updateMasterVolume();

            if (this.soundEnabled) {
                this.unlockAudio();
                this.startMusic();
            } else {
                this.stopMusic();
            }
        });

        this.volumeText = this.add.text(-90, 34, "حجم صدا", {
            fontFamily: "Tahoma",
            fontSize: "10px",
            color: "#ffffff"
        });

        this.audioPanel.add(this.volumeText);

        this.volumeBar = this.add.rectangle(-18, 39, 45, 5, 0x778995)
            .setInteractive();

        this.audioPanel.add(this.volumeBar);

        this.volumeKnob = this.add.circle(-18, 39, 5, 0xffb13b)
            .setInteractive({ draggable: true });

        this.audioPanel.add(this.volumeKnob);
        this.input.setDraggable(this.volumeKnob);

        this.volumeKnob.on("drag", (pointer, dragX) => {
            const x = Phaser.Math.Clamp(dragX, -40, 4);

            this.volumeKnob.x = x;
            this.volume = (x + 40) / 44;
            this.updateMasterVolume();
        });

        this.volumeBar.on("pointerdown", pointer => {
            const x = Phaser.Math.Clamp(
                pointer.x - this.audioPanel.x,
                -40,
                4
            );

            this.volumeKnob.x = x;
            this.volume = (x + 40) / 44;
            this.updateMasterVolume();
        });
    }

    unlockAudio() {
        if (this.audioReady) {
            if (this.audioContext.state === "suspended") {
                this.audioContext.resume();
            }

            if (this.musicEnabled && this.soundEnabled) {
                this.startMusic();
            }

            return;
        }

        try {
            const AudioContextClass =
                window.AudioContext || window.webkitAudioContext;

            if (!AudioContextClass) return;

            this.audioContext = new AudioContextClass();

            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.audioContext.destination);

            this.audioReady = true;

            if (this.audioContext.state === "suspended") {
                this.audioContext.resume();
            }

            this.startMusic();
        } catch (error) {
            console.warn("Audio unavailable:", error);
        }
    }

    updateMasterVolume() {
        if (!this.masterGain || !this.audioContext) return;

        const targetVolume = this.soundEnabled ? this.volume : 0;

        this.masterGain.gain.setTargetAtTime(
            targetVolume,
            this.audioContext.currentTime,
            0.05
        );
    }

    playTone(frequency, duration, type = "sine", volume = 0.15) {
        if (
            !this.audioReady ||
            !this.soundEnabled ||
            !this.audioContext ||
            !this.masterGain
        ) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            oscillator.type = type;

            oscillator.frequency.setValueAtTime(
                frequency,
                this.audioContext.currentTime
            );

            gain.gain.setValueAtTime(
                0.0001,
                this.audioContext.currentTime
            );

            gain.gain.exponentialRampToValueAtTime(
                Math.max(0.0002, volume),
                this.audioContext.currentTime + 0.02
            );

            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                this.audioContext.currentTime + duration
            );

            oscillator.connect(gain);
            gain.connect(this.masterGain);

            oscillator.start();
            oscillator.stop(
                this.audioContext.currentTime + duration + 0.03
            );
        } catch (error) {
            console.warn("Sound error:", error);
        }
    }

    playJumpSound() {
        this.playTone(360, 0.12, "triangle", 0.16);
        this.playTone(540, 0.16, "sine", 0.10);
    }

    playCollectSound() {
        this.playTone(660, 0.10, "sine", 0.15);

        this.time.delayedCall(70, () => {
            if (this.state === "playing") {
                this.playTone(880, 0.15, "triangle", 0.13);
            }
        });
    }

    playCrashSound() {
        this.playTone(120, 0.35, "sawtooth", 0.2);
        this.playTone(70, 0.45, "square", 0.12);
    }

    startMusic() {
        if (
            !this.audioReady ||
            !this.soundEnabled ||
            !this.musicEnabled ||
            this.musicTimer
        ) return;

        const melody = [
            392, 494, 587, 494,
            440, 523, 659, 523,
            392, 494, 587, 659,
            587, 494, 440, 392
        ];

        this.musicTimer = this.time.addEvent({
            delay: 260,
            loop: true,
            callback: () => {
                if (!this.audioReady || !this.soundEnabled) return;

                const note = melody[this.musicStep % melody.length];

                this.playTone(note, 0.20, "triangle", 0.035);

                if (this.musicStep % 4 === 0) {
                    this.playTone(note / 2, 0.25, "sine", 0.025);
                }

                this.musicStep++;
            }
        });
    }

    stopMusic() {
        if (this.musicTimer) {
            this.musicTimer.remove(false);
            this.musicTimer = null;
        }
    }

    createControls() {
        this.cursors = this.input.keyboard.createCursorKeys();

        this.input.keyboard.on("keydown-SPACE", () => this.jump());
        this.input.keyboard.on("keydown-UP", () => this.jump());

        this.input.on("pointerdown", pointer => {
            if (
                pointer.y > 100 &&
                pointer.x < 650 &&
                this.state === "playing"
            ) {
                this.unlockAudio();
                this.jump();
            }
        });
    }

    jump() {
        if (this.state !== "playing") return;

        if (
            this.player.body.blocked.down ||
            this.player.body.touching.down
        ) {
            this.unlockAudio();
            this.player.body.setVelocityY(-520);
            this.playJumpSound();
        }
    }

    createAmbientEffects() {
        this.dust = [];

        for (let i = 0; i < 18; i++) {
            const particle = this.add.circle(
                Math.random() * this.W,
                200 + Math.random() * 220,
                1 + Math.random() * 2,
                0xe5d8ba,
                0.25
            );

            this.dust.push(particle);

            this.tweens.add({
                targets: particle,
                x: particle.x + 60 + Math.random() * 50,
                y: particle.y - 20 - Math.random() * 35,
                alpha: 0.05,
                duration: 2500 + Math.random() * 2500,
                yoyo: true,
                repeat: -1
            });
        }
    }

    emitParticles(x, y, color = 0xffd34e) {
        for (let i = 0; i < 9; i++) {
            const particle = this.add.circle(
                x, y, 3 + Math.random() * 3, color
            );

            const angle = Math.random() * Math.PI * 2;
            const distance = 25 + Math.random() * 45;

            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: 0,
                scale: 0,
                duration: 400 + Math.random() * 250,
                onComplete: () => particle.destroy()
            });
        }
    }

    spawnObstacle() {
        if (this.state !== "playing") return;

        const obstacle = this.add.container(1010, 420);
        const g = this.add.graphics();

        g.fillStyle(0x9b572a, 1);
        g.fillRoundedRect(-22, -28, 44, 50, 4);
        g.lineStyle(3, 0x613719, 1);
        g.strokeRoundedRect(-22, -28, 44, 50, 4);

        g.lineStyle(5, 0xf7c34e, 1);
        g.lineBetween(-15, -18, 15, 0);
        g.lineBetween(-15, 0, 15, 18);

        g.fillStyle(0xd4b38d, 1);
        g.fillCircle(-15, -20, 3);
        g.fillCircle(15, -20, 3);

        obstacle.add(g);

        this.physics.add.existing(obstacle);
        obstacle.body.setAllowGravity(false);
        obstacle.body.setImmovable(true);
        obstacle.body.setSize(42, 50);
        obstacle.body.setOffset(-21, -25);
        obstacle.body.setVelocityX(-this.speed);

        this.obstacles.add(obstacle);
        obstacle.setDepth(10);
    }

    spawnTire() {
        if (this.state !== "playing") return;

        const tire = this.add.container(1010, 365);
        const g = this.add.graphics();

        g.lineStyle(9, 0x111517, 1);
        g.strokeCircle(0, 0, 16);

        g.lineStyle(3, 0x596165, 1);
        g.strokeCircle(0, 0, 11);

        g.lineStyle(2, 0x737c80, 0.8);
        g.strokeCircle(0, 0, 6);

        for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI / 4;

            g.lineBetween(
                Math.cos(angle) * 12,
                Math.sin(angle) * 12,
                Math.cos(angle) * 18,
                Math.sin(angle) * 18
            );
        }

        tire.add(g);

        this.physics.add.existing(tire);
        tire.body.setAllowGravity(false);
        tire.body.setImmovable(true);
        tire.body.setCircle(18);
        tire.body.setVelocityX(-this.speed);

        tire.setDepth(15);
        this.tires.add(tire);
    }

    collectTire(player, tire) {
        if (this.state !== "playing" || !tire.active) return;

        tire.destroy();

        this.tiresCollected++;
        this.score += 10;

        this.updateHUD();
        this.playCollectSound();

        this.emitParticles(player.x, player.y - 20, 0xffd34e);
        this.cameras.main.shake(90, 0.002);
    }

    hitObstacle() {
        if (this.state !== "playing") return;
        this.endGame();
    }

    endGame() {
        if (this.state !== "playing") return;

        this.state = "gameover";
        this.physics.pause();
        this.stopMusic();
        this.playCrashSound();

        this.emitParticles(this.player.x, this.player.y, 0xff6545);
        this.cameras.main.shake(350, 0.012);

        this.showEndScreen();
    }

    showEndScreen() {
        this.add.rectangle(
            this.W / 2, this.H / 2,
            this.W, this.H, 0x000000, 0.78
        ).setDepth(200);

        const panel = this.add.graphics();

        panel.fillStyle(0x1a2934, 0.98);
        panel.fillRoundedRect(270, 105, 420, 330, 18);
        panel.lineStyle(3, 0xf3a42f, 1);
        panel.strokeRoundedRect(270, 105, 420, 330, 18);
        panel.setDepth(201);

        this.add.text(480, 145, "پایان بازی!", {
            fontFamily: "Tahoma",
            fontSize: "34px",
            fontStyle: "bold",
            color: "#ffb33f"
        }).setOrigin(0.5).setDepth(202);

        this.add.text(480, 205,
            "امتیاز نهایی: " + Math.floor(this.score), {
                fontFamily: "Tahoma",
                fontSize: "23px",
                color: "#ffffff"
            }
        ).setOrigin(0.5).setDepth(202);

        this.add.text(480, 245,
            "لاستیک جمع‌آوری‌شده: " + this.tiresCollected, {
                fontFamily: "Tahoma",
                fontSize: "18px",
                color: "#ffd36b"
            }
        ).setOrigin(0.5).setDepth(202);

        this.makeMenuButton(
            480, 315, "شروع دوباره", 0x26734d,
            () => this.scene.restart(), 203
        );

        this.makeMenuButton(
            480, 375, "خروج از بازی", 0xb83232,
            () => this.exitGame(), 203
        );
    }

    makeMenuButton(x, y, label, color, callback, depth = 300) {
        const button = this.add.text(x, y, label, {
            fontFamily: "Tahoma",
            fontSize: "19px",
            fontStyle: "bold",
            color: "#ffffff",
            backgroundColor: "#" + color.toString(16).padStart(6, "0"),
            padding: { x: 24, y: 12 }
        }).setOrigin(0.5)
          .setDepth(depth)
          .setInteractive({ useHandCursor: true });

        button.on("pointerover", () => button.setScale(1.05));
        button.on("pointerout", () => button.setScale(1));
        button.on("pointerdown", callback);

        return button;
    }

    exitGame() {
        if (this.state === "menu") return;

        this.state = "menu";
        this.stopMusic();

        if (this.obstacleTimer) this.obstacleTimer.paused = true;
        if (this.tireTimer) this.tireTimer.paused = true;

        this.physics.pause();

        if (this.playerRunTween) {
            this.playerRunTween.pause();
        }

        this.showMainMenu();
    }

    showMainMenu() {
        this.exitMenuObjects = [];

        const overlay = this.add.rectangle(
            this.W / 2, this.H / 2,
            this.W, this.H, 0x101820, 0.96
        ).setDepth(500);

        this.exitMenuObjects.push(overlay);

        const panel = this.add.graphics();

        panel.fillStyle(0x1a2934, 1);
        panel.fillRoundedRect(220, 105, 520, 330, 18);
        panel.lineStyle(3, 0xf3a42f, 1);
        panel.strokeRoundedRect(220, 105, 520, 330, 18);
        panel.setDepth(501);

        this.exitMenuObjects.push(panel);

        const title = this.add.text(480, 160, "YAZD TIRE", {
            fontFamily: "Arial",
            fontSize: "38px",
            fontStyle: "bold",
            color: "#f5a52f"
        }).setOrigin(0.5).setDepth(502);

        this.exitMenuObjects.push(title);

        const subtitle = this.add.text(480, 210, "GAME CLUB", {
            fontFamily: "Arial",
            fontSize: "24px",
            fontStyle: "bold",
            color: "#ffffff"
        }).setOrigin(0.5).setDepth(502);

        this.exitMenuObjects.push(subtitle);

        const message = this.add.text(480, 255, "از بازی خارج شدید", {
            fontFamily: "Tahoma",
            fontSize: "20px",
            color: "#dce5eb"
        }).setOrigin(0.5).setDepth(502);

        this.exitMenuObjects.push(message);

        const restartButton = this.makeMenuButton(
            480, 325, "شروع دوباره بازی", 0x26734d,
            () => this.scene.restart(), 503
        );

        const resumeButton = this.makeMenuButton(
            480, 385, "بازگشت به بازی", 0xb83232,
            () => this.resumeGame(), 503
        );

        this.exitMenuObjects.push(restartButton, resumeButton);
    }

    resumeGame() {
        if (this.state !== "menu") return;

        this.exitMenuObjects.forEach(object => {
            if (object && object.destroy) object.destroy();
        });

        this.exitMenuObjects = [];

        this.state = "playing";

        this.physics.resume();

        if (this.obstacleTimer) this.obstacleTimer.paused = false;
        if (this.tireTimer) this.tireTimer.paused = false;

        if (this.playerRunTween) this.playerRunTween.resume();

        this.unlockAudio();
    }

    update(time, delta) {
        if (this.state !== "playing") return;

        const dt = delta / 1000;
        this.elapsed += dt;

        this.speed = Math.min(550, 330 + this.elapsed * 3);

        this.obstacles.getChildren().forEach(obstacle => {
            if (!obstacle.active) return;

            obstacle.body.setVelocityX(-this.speed);

            if (obstacle.x < -80) {
                obstacle.destroy();
                this.score += 1;
                this.updateHUD();
            }
        });

        this.tires.getChildren().forEach(tire => {
            if (!tire.active) return;

            tire.body.setVelocityX(-this.speed);
            tire.rotation += dt * 2;

            if (tire.x < -80) tire.destroy();
        });

        if (this.conveyorRollers) {
            this.conveyorRollers.forEach(roller => {
                roller.rotation += dt * 2;
            });
        }

        if (this.conveyorLines) {
            this.conveyorLines.forEach(line => {
                line.x -= this.speed * dt * 0.12;

                if (line.x < -40) line.x = this.W + 40;
            });
        }

        if (this.playerShadow) {
            const jumping = !this.player.body.blocked.down;

            this.playerShadow.setScale(
                jumping ? 0.75 : 1,
                jumping ? 0.7 : 1
            );

            this.playerShadow.setAlpha(jumping ? 0.18 : 0.32);
        }

        if (
            this.player.body.blocked.down &&
            this.playerRunTween &&
            !this.playerRunTween.isPlaying()
        ) {
            this.playerRunTween.resume();
        }

        if (
            !this.player.body.blocked.down &&
            this.playerRunTween &&
            this.playerRunTween.isPlaying()
        ) {
            this.playerRunTween.pause();
        }

        this.score += dt * 0.5;

        if (Math.floor(this.score) !== this.lastScoreDisplay) {
            this.lastScoreDisplay = Math.floor(this.score);
            this.updateHUD();
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    parent: "game-container",
    backgroundColor: "#1b2832",

    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    scene: [FactoryRunner]
};

const game = new Phaser.Game(config);

window.yazdTireGame = game;
