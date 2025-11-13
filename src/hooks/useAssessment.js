// src/hooks/useAssessment.js
import { useState, useCallback } from 'react';
import { initialAssessmentData, assessmentSteps } from '../data/assessmentContent';

export const useAssessment = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [data, setData] = useState(initialAssessmentData);
    const [exclusionTriggered, setExclusionTriggered] = useState(false);

    const totalSteps = assessmentSteps.length;

    const updateData = useCallback((section, value) => {
        setData(prevData => ({
            ...prevData,
            [section]: value,
        }));
    }, []);

    const goToNextStep = useCallback(() => {
        // Check for exclusion criteria after step 3 (index 2)
        if (currentStep === 2) {
            const exclusionMet = Object.values(data.exclusionCriteria || {}).some(val => val === 'yes');
            if (exclusionMet) {
                setExclusionTriggered(true);
                setCurrentStep(totalSteps - 1); // Skip to report
                return;
            }
        }

        if (currentStep < totalSteps - 1) {
            setCurrentStep(prev => prev + 1);
        }
    }, [currentStep, totalSteps, data.exclusionCriteria]);

    const goToPrevStep = useCallback(() => {
        if (exclusionTriggered) {
            setExclusionTriggered(false);
            setCurrentStep(2); // Go back to exclusion step
        } else if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep, exclusionTriggered]);

    return {
        currentStep,
        data,
        updateData,
        goToNextStep,
        goToPrevStep,
        isFirstStep: currentStep === 0,
        isLastStep: currentStep === totalSteps - 2, // -2 because last step is report
        totalSteps,
        exclusionTriggered
    };
};
