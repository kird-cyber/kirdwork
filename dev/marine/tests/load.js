// load the pure modules into node (no DOM)
const fs = require('fs'), path = require('path');
module.exports = function load(extra) {
  const files = ['config.js', 'core.js', 'mapgen.js', 'sim.js'].concat(extra || []);
  const src = files.map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
  return new Function(src + ';return {CONFIG,createMatch,step,beginTurn,cmdMove,cmdFire,cmdItem,cmdTimeout,applyTurnInput,stateHash,buildMap,buildPath,pathAt,burstDistance,curSub,solidAt,hullFree,explode,outOfMap,clearAround' + (extra && extra.includes('bot.js') ? ',botPlan,botPlayTurn' : '') + '};')();
};
