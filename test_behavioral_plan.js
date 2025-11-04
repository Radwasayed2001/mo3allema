// Test script for behavioral plan generation
// This script demonstrates the improved behavioral plan API

const testBehavioralPlan = async () => {
    const testPayload = {
        planType: 'behavioral',
        textNote: 'الطفل لا يصلي عند سماع الأذان ويفضل اللعب حتى يُذكّر عدة مرات.'
    };

    try {
        console.log('Testing behavioral plan generation...');
        console.log('Payload:', JSON.stringify(testPayload, null, 2));
        
        const response = await fetch('http://localhost:3001/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testPayload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        console.log('\n=== BEHAVIORAL PLAN RESULT ===');
        console.log('Raw AI Response:', JSON.stringify(result.ai?.raw, null, 2));
        console.log('\nNormalized Response:', JSON.stringify(result.ai?.normalized, null, 2));
        
        // Check for the specific fields we expect
        const normalized = result.ai?.normalized;
        if (normalized) {
            console.log('\n=== FIELD VALIDATION ===');
            console.log('✅ Behavior Goal:', normalized.behavior_goal || '❌ Missing');
            console.log('✅ Summary:', normalized.summary || '❌ Missing');
            console.log('✅ Antecedents:', normalized.antecedents?.length > 0 ? `${normalized.antecedents.length} items` : '❌ Empty');
            console.log('✅ Consequences:', normalized.consequences?.length > 0 ? `${normalized.consequences.length} items` : '❌ Empty');
            console.log('✅ Function Analysis:', normalized.function_analysis || '❌ Missing');
            console.log('✅ Antecedent Strategies:', normalized.antecedent_strategies?.length > 0 ? `${normalized.antecedent_strategies.length} items` : '❌ Empty');
            console.log('✅ Replacement Behavior:', normalized.replacement_behavior?.skill ? 'Present' : '❌ Missing');
            console.log('✅ Consequence Strategies:', normalized.consequence_strategies?.length > 0 ? `${normalized.consequence_strategies.length} items` : '❌ Empty');
            console.log('✅ Data Collection:', normalized.data_collection?.metric ? 'Present' : '❌ Missing');
            console.log('✅ Parent Instructions:', normalized.parent_instructions || '❌ Missing');
            
            // Check for repetition of input text
            const inputText = testPayload.textNote.toLowerCase();
            const hasRepetition = normalized.behavior_goal?.toLowerCase().includes(inputText) ||
                                normalized.summary?.toLowerCase().includes(inputText) ||
                                normalized.antecedents?.some(a => a.toLowerCase().includes(inputText)) ||
                                normalized.consequences?.some(c => c.toLowerCase().includes(inputText));
            
            console.log('\n=== REPETITION CHECK ===');
            console.log(hasRepetition ? '❌ Input text repetition detected' : '✅ No input text repetition');
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
};

// Run the test if this script is executed directly
if (typeof window === 'undefined') {
    testBehavioralPlan();
}

module.exports = { testBehavioralPlan };
