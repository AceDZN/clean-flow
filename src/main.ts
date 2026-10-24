import '@fontsource/rubik/hebrew-400.css';
import '@fontsource/rubik/hebrew-500.css';
import '@fontsource/rubik/hebrew-700.css';
import '@fontsource/rubik/hebrew-800.css';
import '@fontsource/rubik/latin-400.css';
import '@fontsource/rubik/latin-700.css';
import './style.css';
import { Game } from './game/Game';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const game = new Game(canvas);
void game.boot();
