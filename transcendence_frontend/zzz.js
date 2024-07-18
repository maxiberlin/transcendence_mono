const running = true;
const scored = true;
const paused = false;

console.log(`paused: ${!running | scored | paused ? 'true' : 'false'}`);
