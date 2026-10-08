// Industrial Audio Cues using Web Audio API (Synthesized Control-Room Alerts)

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Industrial two-tone alert chirp for PPE warning
  public playAlert(): void {
    this.playWarnBeep();
  }

  public playWarnBeep(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.23);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Melodic triple chime for turnstile access verification
  public playChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.33);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Industrial siren pulse for Fire / Smoke Critical Alert
  public playCriticalSiren(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.36);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.40);
    } catch {
      // Ignore audio policy restriction
    }
  }

  // ---------------- Factory Voice PA Announcer (Web Speech API) ----------------
  private lastAnnounceTime: number = 0;
  private voiceMuted: boolean = false;

  public toggleVoice(): boolean {
    this.voiceMuted = !this.voiceMuted;
    return !this.voiceMuted;
  }

  public isVoiceEnabled(): boolean {
    return !this.voiceMuted && !this.isMuted;
  }

  public announceViolation(zoneName: string, missingGear: string[]): void {
    if (this.isMuted || this.voiceMuted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const now = Date.now();
    // 14-second cooldown to prevent overlapping audio
    if (now - this.lastAnnounceTime < 14000) return;
    this.lastAnnounceTime = now;

    this.playWarnBeep();

    setTimeout(() => {
      try {
        const gearText = missingGear.length > 0 ? missingGear.join(' and ') : 'required protective gear';
        const msg = `Attention ${zoneName}. Personnel detected without mandatory ${gearText}. Immediate safety compliance required.`;
        const utterance = new SpeechSynthesisUtterance(msg);
        utterance.rate = 1.05;
        utterance.pitch = 0.95;
        utterance.volume = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch {}
    }, 280);
  }

  public announceHazard(hazardType: string, zoneName: string): void {
    if (this.isMuted || this.voiceMuted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const now = Date.now();
    if (now - this.lastAnnounceTime < 10000) return;
    this.lastAnnounceTime = now;

    this.playCriticalSiren();

    setTimeout(() => {
      try {
        const msg = `Emergency Alert. Critical ${hazardType} hazard detected in ${zoneName}. Automated fire sentinel activated.`;
        const utterance = new SpeechSynthesisUtterance(msg);
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch {}
    }, 450);
  }
}

export const soundEngine = new SoundEngine();
