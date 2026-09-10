export type ButtonState = { pressed: boolean; held: boolean; released: boolean };
export const buttonNames = ['primary', 'impulse', 'pull', 'pulse', 'orbit'] as const;
export type ButtonName = typeof buttonNames[number];
export type Buttons = Record<ButtonName, ButtonState>;
export class ButtonTracker {
  private previous = new Set<ButtonName>();
  sample(held: Partial<Record<ButtonName, boolean>>): Buttons {
    const result = {} as Buttons;
    for (const key of buttonNames) { const down = !!held[key]; result[key] = { held: down, pressed: down && !this.previous.has(key), released: !down && this.previous.has(key) }; if (down) this.previous.add(key); else this.previous.delete(key); }
    return result;
  }
  reset(): void { this.previous.clear(); }
}
