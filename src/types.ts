export type BurnTool = 'match' | 'lighter' | 'torch' | 'ember' | 'pencil';

export type PaperTemplate = 'sketch_butterfly' | 'secret_note' | 'contract' | 'blank_canvas';

export type TraceGuideType = 'none' | 'octopus' | 'snail' | 'cat' | 'heart';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  type: 'flame' | 'spark' | 'smoke' | 'ash';
}

export interface BurnHole {
  id: number;
  x: number; // canvas coordinates relative to paper
  y: number;
  radius: number;
  maxRadius: number;
  intensity: number; // 0 to 1
  seed: number;
  active: boolean; // still burning or fully charred
  createdTime: number;
  toolType?: BurnTool;
}

export interface PencilStroke {
  id: number;
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export interface NicknameSlots {
  adjective: string;
  noun: string;
  number: string;
  confirmed: boolean;
}
