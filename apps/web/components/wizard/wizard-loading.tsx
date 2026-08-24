"use client"

import { ArrowLeft, CircleAlert, LoaderCircle, RotateCw } from "lucide-react"
import { Button } from "../ui/button"
import React from "react"

const GENERATING_QUESTIONS_LOADING_TEXT = [
  "Analyzing your schedule...",
  "Finding the most useful follow-up questions...",
  "Looking for missing details...",
  "Identifying likely constraints...",
  "Matching your plan to your goals...",
  "Checking for important preferences...",
  "Building a personalized question set...",
  "Organizing your information...",
  "Refining the best next questions...",
  "Almost ready to personalize your plan...",
]

const ALMOST_GENERATING_QUESTIONS_LOADING_TEXT = [
  "Almost there...",
  "Finishing up...",
  "Just a moment longer...",
  "Wrapping this up...",
  "One last pass...",
  "Nearly done...",
]



function WizardLoading({
  title,
  estimatedTime,
  cancelFn,
}: {
  title: string
  estimatedTime: string
  cancelFn: () => void
}) {
  const [isAlmostDone, setIsAlmostDone] = React.useState(false)
  const [messageIndex, setMessageIndex] = React.useState(0)
  const [fade, setFade] = React.useState(true)

  const messages = isAlmostDone
    ? ALMOST_GENERATING_QUESTIONS_LOADING_TEXT
    : GENERATING_QUESTIONS_LOADING_TEXT

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsAlmostDone(true)
      setMessageIndex(0)
    }, 30000)

    return () => window.clearTimeout(timeout)
  }, [])

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setFade(false)

      window.setTimeout(() => {
        setMessageIndex((current) => (current + 1) % messages.length)
        setFade(true)
      }, 200)
    }, 2500)

    return () => window.clearInterval(interval)
  }, [messages.length, isAlmostDone])

  return (
    <div className="flex min-h-[450px] flex-col items-center justify-center px-4 text-center">
      <LoaderCircle className="mb-6 h-10 w-10 animate-spin text-primary" />

      <h2 className="text-3xl font-semibold">Generating {title}</h2>

      <p
        className={[
          "text-md mt-1 max-w-sm text-muted-foreground transition-opacity duration-200",
          fade ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        {messages[messageIndex]}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        This usually takes {estimatedTime}
      </p>
<Button variant="link" onClick={cancelFn}>
  Cancel Generation
</Button>
    </div>
  )
}
function WizardLoadingError({
  onRetry,
  goBackFn,
}: {
  onRetry: () => void
  goBackFn: () => void
}) {
  return (
    <div className="flex min-h-[450px] flex-col items-center justify-center text-center">
      <CircleAlert className="mb-2 h-10 w-10 text-destructive" />

      <h2 className="text-3xl font-semibold">Something went wrong</h2>

      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {" We couldn't generate your request."}
      </p>

<div className="mt-3 flex justify-center gap-3">
  <Button variant="outline" onClick={goBackFn}>
    <ArrowLeft className="h-4 w-4" />
    Go Back
  </Button>

  <Button onClick={onRetry}>
    <RotateCw className="h-4 w-4" />
    Retry Generation
  </Button>
</div>
    </div>
  )
}

export {
  WizardLoading,
  WizardLoadingError,
}
