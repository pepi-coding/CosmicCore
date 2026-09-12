import Phaser from 'phaser';
import { BootScene, MainMenuScene, TrainingScene, PvEMissionScene, PvPArenaScene, ResultsScene } from './game/scenes/Scenes';
import './style.css';
import { DungeonSelectScene, CollectionScene } from './game/scenes/MetaScenes';
export const game = new Phaser.Game({ type: Phaser.AUTO, parent: 'game', backgroundColor: '#080c19', antialias: true, scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight, autoCenter: Phaser.Scale.CENTER_BOTH }, physics: { default: 'arcade', arcade: { debug: false } }, scene: [BootScene, MainMenuScene, DungeonSelectScene, CollectionScene, TrainingScene, PvEMissionScene, PvPArenaScene, ResultsScene], input: { activePointers: 5 }, render: { pixelArt: false }, fps: { target: 60 } });
