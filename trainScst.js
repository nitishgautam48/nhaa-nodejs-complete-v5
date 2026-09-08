// ================================================================
//  TRAIN SC/ST MODEL - Run this to train the engine
//  node trainScst.js
// ================================================================

import SCSTTrainer from './models/scstTrainer.js';

const trainer = new SCSTTrainer();
trainer.train();

console.log('\n✅ Training completed successfully!');
console.log('📊 Model Summary:');
console.log(`   - Keywords: ${Object.keys(trainer.keywordModel).length}`);
console.log(`   - Patterns: ${Object.keys(trainer.patternModel).length}`);
console.log(`   - Abuse Types: ${Object.keys(trainer.severityModel).length}`);

// Test the trained model
console.log('\n🧪 Testing the trained model:');
const testTexts = [
    "A 14-year-old tribal girl was drugged and gang-raped. She refused to withdraw the case.",
    "A Dalit man was falsely convicted and spent 20 years in jail.",
    "The weather is nice today. Everything is fine."
];

for (const text of testTexts) {
    const result = trainer.analyze(text);
    console.log(`\n📝 "${text.substring(0, 50)}..."`);
    console.log(`   Severity: ${result.severityLevel} (${Math.round(result.severity)}/100)`);
    console.log(`   Patterns: ${result.patterns.map(p => p.name).join(', ') || 'None'}`);
    console.log(`   Communities: ${result.communities.join(', ') || 'None'}`);
}