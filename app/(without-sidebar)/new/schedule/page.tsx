import WizardStep from "@/components/wizard/wizard-step"

//the step the users at
const userWizardStep = 1
export default function NewSchedulePage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center p-6">
      <WizardStep 
        initStepNum={userWizardStep}
        />
    </div>
  )
}
