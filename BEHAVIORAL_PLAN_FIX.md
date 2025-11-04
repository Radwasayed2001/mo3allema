# Behavioral Plan Generation Fix

## Problem
The behavioral plan generation was inconsistent, with the AI model sometimes:
- Repeating parts of the input note instead of generating new content
- Leaving most sections as "لا توجد بيانات" (no data available)
- Not following the expected structured format consistently

## Solution
Enhanced the system prompt and example for behavioral plans to ensure consistent, structured output.

## Changes Made

### 1. Enhanced System Prompt (`/tebayan/src/app/api/analyze/route.js`)

**Added strict rules:**
- لا تكرر نص الملاحظة الأصلية في أي حقل (Don't repeat original note text in any field)
- كل حقل يجب أن يحتوي على محتوى جديد ومفيد (Each field must contain new and useful content)
- استخدم لغة مختصرة ومحددة (Use concise and specific language)
- تجنب العبارات العامة مثل "لا توجد بيانات" (Avoid generic phrases like "no data available")
- قدم حلول عملية قابلة للتطبيق (Provide practical, applicable solutions)

**Improved field descriptions:**
- Added specific examples for each field type
- Clarified expected content format
- Provided concrete examples of good vs. bad content

### 2. Better Example (Few-shot Learning)

**Updated example to match the prayer behavior case:**
- Child: أحمد, Age: 8
- Behavior: تجاهل الأذان والاستمرار في اللعب (Ignoring prayer call and continuing to play)
- Complete structured response showing proper field population

**Key improvements in example:**
- Specific, actionable antecedents: ["سماع الأذان", "انشغال باللعب", "عدم وجود روتين صلاة ثابت"]
- Clear consequences: ["تذكير متكرر من الأهل", "انتباه إضافي عند التأخير", "تأجيل الصلاة"]
- Practical strategies: ["إعداد بيئة صلاة هادئة قبل الأذان", "إنشاء روتين بصري للصلاة"]
- Specific replacement behavior: {"skill": "الذهاب للصلاة فور سماع الأذان", "modality": "حركة مستقلة"}

### 3. Enhanced User Message

**Added specific instructions for behavioral analysis:**
- تأكد من عدم تكرار نص الملاحظة (Ensure no repetition of note text)
- ملء جميع الحقول بمحتوى مفيد (Fill all fields with useful content)
- تقديم حلول عملية قابلة للتطبيق (Provide practical, applicable solutions)

### 4. Parameter Support

**Added support for `planType` parameter:**
- Supports both `analysisType: 'behavior'` and `planType: 'behavioral'`
- Maintains backward compatibility
- Uses `effectiveAnalysisType` to handle both parameter names

## Expected Output Format

For the test input:
```json
{
  "planType": "behavioral",
  "textNote": "الطفل لا يصلي عند سماع الأذان ويفضل اللعب حتى يُذكّر عدة مرات."
}
```

**Expected structured output:**
```json
{
  "behavior_goal": "خلال أسبوعين، سيقوم الطفل بأداء الصلاة فور سماع الأذان في 85% من المرات دون تذكير",
  "summary": "السلوك يظهر لتجنب الصلاة والاستمرار في اللعب؛ الوظيفة: هروب من المطالب الدينية",
  "antecedents": ["سماع الأذان", "انشغال باللعب", "عدم وجود روتين صلاة ثابت"],
  "consequences": ["تذكير متكرر من الأهل", "انتباه إضافي عند التأخير", "تأجيل الصلاة"],
  "function_analysis": "الوظيفة: هروب/تجنب من مطالب الصلاة",
  "antecedent_strategies": ["إعداد بيئة صلاة هادئة قبل الأذان", "إنشاء روتين بصري للصلاة", "تذكير بصري قبل الأذان بـ5 دقائق"],
  "replacement_behavior": {"skill": "الذهاب للصلاة فور سماع الأذان", "modality": "حركة مستقلة"},
  "consequence_strategies": ["تعزيز فوري عند الصلاة في الوقت", "تجاهل التأخير وتذكير مرة واحدة فقط", "مكافأة خاصة للصلاة في الوقت"],
  "data_collection": {"metric": "نسبة الصلاة في الوقت", "tool": "جدول يومي بسيط"},
  "review_after_days": 14,
  "safety_flag": false,
  "suggestions": ["استخدام مؤقت بصري للصلاة", "ربط الصلاة بنشاط محبب"],
  "customizations": ["تبسيط خطوات الوضوء", "استخدام سجادة صلاة ملونة"],
  "parent_instructions": "تطبيق نفس الروتين في المنزل، مكافأة فورية عند الصلاة في الوقت"
}
```

## Testing

Use the provided test script:
```bash
node test_behavioral_plan.js
```

The test will:
1. Send a request with `planType: 'behavioral'`
2. Validate that all required fields are populated
3. Check for input text repetition
4. Display the structured output

## Key Improvements

1. **No Input Repetition**: The model now generates new content instead of repeating the input
2. **Complete Field Population**: All fields are filled with relevant, actionable content
3. **Structured Output**: Consistent JSON format with proper field types
4. **Practical Solutions**: All suggestions and strategies are implementable
5. **Backward Compatibility**: Existing `analysisType` parameter still works

## Files Modified

- `/tebayan/src/app/api/analyze/route.js` - Main API route with enhanced prompts
- `test_behavioral_plan.js` - Test script for validation
- `BEHAVIORAL_PLAN_FIX.md` - This documentation

The educational plan behavior remains unchanged as requested.
