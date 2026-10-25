import '@fontsource/rubik/hebrew-400.css';
import '@fontsource/rubik/hebrew-500.css';
import '@fontsource/rubik/hebrew-700.css';
import '@fontsource/rubik/hebrew-800.css';
import '@fontsource/rubik/latin-400.css';
import '@fontsource/rubik/latin-700.css';
import './style.css';
import './v2/v2.css';
import { initHost } from './host';
import { PuzzleGame } from './v2/PuzzleGame';

initHost('clean-flow');

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const game = new PuzzleGame(canvas);
void game.boot();
