import { C } from '../config/combatV4';
import type { ChannelState } from '../systems/ChannelSystem';
export class CombatAudio {
  context: AudioContext | null = null; oscillator: OscillatorNode | null = null; gain: GainNode | null = null;
  enabled = true; lastMode = ''; warned = false; overloaded = false; maxed = false;
  unlock = (): void => {
    if (!this.enabled) return;
    if (!this.context) { this.context = new AudioContext(); this.oscillator = this.context.createOscillator(); this.gain = this.context.createGain(); this.gain.gain.value = 0; this.oscillator.connect(this.gain); this.gain.connect(this.context.destination); this.oscillator.start(); }
    void this.context.resume();
  };
  constructor() { window.addEventListener('pointerdown', this.unlock); window.addEventListener('keydown', this.unlock); }
  tone(frequency: number, duration: number, volume = 1): void {
    if (!this.enabled || !this.context) return;
    const ctx = this.context, oscillator = ctx.createOscillator(), gain = ctx.createGain(); oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(frequency, ctx.currentTime); oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * .45), ctx.currentTime + duration);
    gain.gain.setValueAtTime(C.feedback.masterVolume * volume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration); oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + duration); oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  update(channel: ChannelState, silent = false): void {
    const active = !silent && this.enabled && channel.mode;
    if (this.context && this.oscillator && this.gain) {
      this.oscillator.type = channel.mode === 'pulse' ? 'triangle' : 'sine';
      this.oscillator.frequency.setTargetAtTime(channel.mode === 'pulse' ? 95 : 55 + channel.intensity * 145, this.context.currentTime, .06);
      this.gain.gain.setTargetAtTime(active ? C.feedback.masterVolume * (.2 + channel.intensity * .4) : 0, this.context.currentTime, .06);
    }
    if (active && active !== this.lastMode) this.tone(active === 'pull' ? 260 : 160, .12, .35);
    if (active && channel.maximumReached && !this.maxed) this.tone(620, .16, .2);
    if (active && channel.flux <= C.flux.low && !this.warned) this.tone(840, .12, .35);
    if (channel.overload > 0 && !this.overloaded) this.tone(65, .45, .7);
    this.lastMode = active || ''; this.warned = channel.flux <= C.flux.low; this.overloaded = channel.overload > 0; this.maxed = channel.maximumReached;
  }
  impact(heavy: boolean): void { this.tone(heavy ? 90 : 190, heavy ? .2 : .09, .8); this.tone(heavy ? 680 : 950, .035, .3); }
  destroy(): void { window.removeEventListener('pointerdown', this.unlock); window.removeEventListener('keydown', this.unlock); void this.context?.close(); }
}
