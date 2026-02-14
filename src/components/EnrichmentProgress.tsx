import { useState, useEffect } from 'react';
import { CheckCircle, Loader2, Search, Database, Brain, Sparkles } from 'lucide-react';

interface EnrichmentStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  duration: number; // milliseconds
}

const enrichmentSteps: EnrichmentStep[] = [
  {
    id: 'detect',
    label: 'Detecting personal email',
    icon: <Search className="w-5 h-5" />,
    duration: 500,
  },
  {
    id: 'submit',
    label: 'Submitting to FullEnrich waterfall',
    icon: <Database className="w-5 h-5" />,
    duration: 1000,
  },
  {
    id: 'enrich',
    label: 'Querying 15 data providers',
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
    duration: 2000,
  },
  {
    id: 'score',
    label: 'Calculating ICP score',
    icon: <Brain className="w-5 h-5" />,
    duration: 800,
  },
  {
    id: 'complete',
    label: 'Enrichment complete!',
    icon: <Sparkles className="w-5 h-5" />,
    duration: 500,
  },
];

interface EnrichmentProgressProps {
  onComplete?: () => void;
}

export function EnrichmentProgress({ onComplete }: EnrichmentProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (currentStep >= enrichmentSteps.length) {
      if (onComplete) {
        setTimeout(onComplete, 500);
      }
      return;
    }

    const timer = setTimeout(() => {
      setCompletedSteps((prev) => new Set(prev).add(currentStep));
      setCurrentStep((prev) => prev + 1);
    }, enrichmentSteps[currentStep].duration);

    return () => clearTimeout(timer);
  }, [currentStep, onComplete]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="space-y-4">
        {enrichmentSteps.map((step, index) => {
          const isCompleted = completedSteps.has(index);
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-4 transition-all duration-300 ${
                isPending ? 'opacity-40' : 'opacity-100'
              }`}
            >
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-green-100 text-green-600'
                    : isCurrent
                    ? 'bg-cyan-100 text-cyan-600'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  step.icon
                )}
              </div>

              {/* Label */}
              <div className="flex-1">
                <p
                  className={`font-medium transition-colors ${
                    isCompleted
                      ? 'text-green-700'
                      : isCurrent
                      ? 'text-cyan-700'
                      : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </p>
              </div>

              {/* Progress Bar */}
              {isCurrent && (
                <div className="w-24 h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-600 animate-progress"
                    style={{
                      animation: `progress ${step.duration}ms linear`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
