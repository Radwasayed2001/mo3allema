import React from 'react';

/**
 * Modern stepper:
 * - horizontal scroll on small screens
 * - compact step bubbles with clear colors
 * - truncated labels, full label shown below on xs via current step
 */
const Stepper = ({ currentStep = 0, steps = [] }) => {
    return (
        <div className="w-full">
            <div className="overflow-x-auto stepper-scroll">
                <div className="flex items-center gap-3 px-3 py-4 min-w-[640px]">
                    {steps.map((label, i) => {
                        const done = i < currentStep;
                        const active = i === currentStep;
                        return (
                            <React.Fragment key={i}>
                                <div className="flex flex-col items-center min-w-[96px]">
                                    <div
                                        aria-current={active ? 'step' : undefined}
                                        className={
                                            `flex items-center justify-center rounded-full transition-all duration-200 
                      ${done ? 'bg-brand-600 text-white w-9 h-9' : active ? 'bg-white ring-4 ring-brand-100 text-brand-700 w-10 h-10' : 'bg-gray-50 text-gray-500 w-8 h-8'}`
                                        }
                                    >
                                        {done ? '✔' : i + 1}
                                    </div>

                                    <div className="mt-2 text-center text-xs md:text-sm w-28 truncate text-slate-600">
                                        {label}
                                    </div>
                                </div>

                                {i < steps.length - 1 && (
                                    <div className={`flex-1 h-0.5 my-0.5 rounded-full mx-2 ${i < currentStep ? 'bg-brand-600' : 'bg-gray-200'}`} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* show full label on small screens for clarity */}
            <div className="md:hidden text-center mt-2 text-sm font-semibold text-slate-700">{steps[currentStep]}</div>
        </div>
    );
};

export default Stepper;
