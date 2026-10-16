class SoundNotificationService {
  private isMuted: boolean = false;
  private audioCtx: AudioContext | null = null;

  constructor() {
    const saved = localStorage.getItem('dineassist_sound_muted');
    this.isMuted = saved === 'true';
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('dineassist_sound_muted', String(muted));
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Play clean synthesized harmonic chime for incoming requests or alerts
   */
  public playAlert(type: 'request' | 'order' | 'bill' = 'request') {
    if (this.isMuted) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      if (type === 'request') {
        // Double pleasant notification bell: 587Hz (D5) -> 880Hz (A5)
        this.playTone(587.33, now, 0.15, 0.18);
        this.playTone(880.00, now + 0.12, 0.35, 0.22);
      } else if (type === 'order') {
        // Kitchen order bell: 523Hz (C5) -> 659Hz (E5) -> 784Hz (G5)
        this.playTone(523.25, now, 0.12, 0.15);
        this.playTone(659.25, now + 0.1, 0.12, 0.15);
        this.playTone(783.99, now + 0.2, 0.3, 0.2);
      } else if (type === 'bill') {
        // Cash register chime: 698Hz (F5) -> 880Hz (A5)
        this.playTone(698.46, now, 0.12, 0.15);
        this.playTone(880.00, now + 0.12, 0.25, 0.18);
      }
    } catch (err) {
      console.warn('[SoundService] Audio playback skipped:', err);
    }
  }

  private playTone(freq: number, startTime: number, duration: number, gainVal = 0.2) {
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

export const soundService = new SoundNotificationService();
