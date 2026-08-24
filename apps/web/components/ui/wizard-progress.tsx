import React from "react"

type WizardProgressProps = {
    value:number,
    max:number,
}

export default function WizardProgress({ value,max }: WizardProgressProps) {

return (
<div className="flex w-full items-center">
  {Array.from({ length: max }, (_, i) => i+1).map((step, index) => (
    <React.Fragment key={step}>
      {/* Dot */}
      <div
        className={`h-2.5 w-2.5 shrink-0 rounded-full transition-all duration-300 ${
          step <= value ? "bg-primary" : "bg-muted"
        }`}
      />

      {/* Line */}
      {index < max - 1 && (
        <div className="mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all duration-300 ${
              step < value ? "w-full bg-primary" : "w-0 bg-primary"
            }`}
          />
        </div>
      )}
    </React.Fragment>
  ))}
</div>
)
}