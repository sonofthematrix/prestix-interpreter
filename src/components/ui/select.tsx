import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"

// Type assertion to resolve React 18/19 type conflicts between @types/react and Radix UI
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Select = SelectPrimitive.Root as React.ComponentType<any>

// Type assertions to resolve React 18/19 type conflicts between @types/react and Radix UI
const SelectGroup = SelectPrimitive.Group as React.ComponentType<any>
const SelectValue = SelectPrimitive.Value as React.ComponentType<any>
const SelectTrigger = SelectPrimitive.Trigger as React.ComponentType<any>
const SelectContent = SelectPrimitive.Content as React.ComponentType<any>
const SelectLabel = SelectPrimitive.Label as React.ComponentType<any>
const SelectItem = SelectPrimitive.Item as React.ComponentType<any>
const SelectSeparator = SelectPrimitive.Separator as React.ComponentType<any>
const SelectScrollUpButton = SelectPrimitive.ScrollUpButton as React.ComponentType<any>
const SelectScrollDownButton = SelectPrimitive.ScrollDownButton as React.ComponentType<any>

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}