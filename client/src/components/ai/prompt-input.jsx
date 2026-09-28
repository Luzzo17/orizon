import { ArrowUpIcon, Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

// Versione essenziale del componente Shadcn: solo messaggi di testo.
export function PromptInput({ onSubmit, children }) {
  function handleSubmit(event) {
    event.preventDefault()
    const text = new FormData(event.currentTarget).get("message") || ""
    onSubmit({ text })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border p-2">
      {children}
    </form>
  )
}

export function PromptInputBody({ children }) {
  return <div>{children}</div>
}

export function PromptInputTextarea(props) {
  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing &&
      event.keyCode !== 229
    ) {
      event.preventDefault()
      const form = event.currentTarget.form
      const submit = form.querySelector('button[type="submit"]')
      if (!submit?.disabled) form.requestSubmit()
    }
  }

  return (
    <Textarea
      {...props}
      name="message"
      onKeyDown={handleKeyDown}
      className="max-h-48 resize-none border-0 shadow-none"
    />
  )
}

export function PromptInputFooter({ className, children }) {
  return <div className={cn("mt-2 flex items-center", className)}>{children}</div>
}

export function PromptInputSubmit({ status, ...props }) {
  return (
    <Button {...props} type="submit" size="icon">
      {status === "submitted"
        ? <Loader2Icon className="motion-safe:animate-spin" aria-hidden="true" />
        : <ArrowUpIcon aria-hidden="true" />}
    </Button>
  )
}
