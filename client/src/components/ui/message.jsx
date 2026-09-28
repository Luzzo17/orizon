import { cn } from "@/lib/utils"

function Message({
  className,
  align = "start",
  ...props
}) {
  return (
    <div
      data-slot="message"
      data-align={align}
      className={cn(
        "group/message relative flex w-full min-w-0 data-[align=end]:flex-row-reverse",
        className
      )}
      {...props}
    />
  )
}

function MessageContent({
  className,
  ...props
}) {
  return (
    <div
      data-slot="message-content"
      className={cn(
        "flex w-full min-w-0 flex-col wrap-break-word",
        className
      )}
      {...props}
    />
  )
}

export { Message, MessageContent }
