"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type SearchableSelectProps = {
  value?: string
  onValueChange: (value: string) => void
  options: string[] | { value: string; label: string }[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
}

const getChosung = (str: string): string => {
  const CHOSUNG = [
    "ㄱ",
    "ㄲ",
    "ㄴ",
    "ㄷ",
    "ㄸ",
    "ㄹ",
    "ㅁ",
    "ㅂ",
    "ㅃ",
    "ㅅ",
    "ㅆ",
    "ㅇ",
    "ㅈ",
    "ㅉ",
    "ㅊ",
    "ㅋ",
    "ㅌ",
    "ㅍ",
    "ㅎ",
  ]
  let result = ""
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 44032
    if (code > -1 && code < 11172) {
      result += CHOSUNG[Math.floor(code / 588)]
    } else {
      result += str.charAt(i)
    }
  }
  return result
}

const normalizeForSearch = (str: string): string => {
  return str.toLowerCase().replace(/[\s_-]/g, "")
}

const matchesSearch = (option: string, search: string): boolean => {
  const normalizedOption = normalizeForSearch(option)
  const normalizedSearch = normalizeForSearch(search)
  const chosungOption = getChosung(option)
  const chosungSearch = getChosung(search)

  // 일반 검색
  if (normalizedOption.includes(normalizedSearch)) return true
  // 초성 검색
  if (chosungOption.includes(chosungSearch)) return true
  // 부분 매칭
  if (option.includes(search)) return true

  return false
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "선택하세요...",
  searchPlaceholder = "검색...",
  emptyText = "결과 없음",
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const normalizedOptions = React.useMemo(() => {
    if (options.length === 0) return []
    if (typeof options[0] === "string") {
      return (options as string[]).map((opt) => ({ value: opt, label: opt }))
    }
    return options as { value: string; label: string }[]
  }, [options])

  const filteredOptions = React.useMemo(() => {
    if (!search) return normalizedOptions
    return normalizedOptions.filter((option) => matchesSearch(option.label, search))
  }, [normalizedOptions, search])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-11", className)}
        >
          {value ? normalizedOptions.find((option) => option.value === value)?.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <div
            className="max-h-[300px] overflow-y-auto overflow-x-hidden"
            onWheel={(e) => {
              // 스크롤 이벤트 전파를 허용
              e.stopPropagation()
            }}
          >
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue === value ? "" : currentValue)
                      setOpen(false)
                      setSearch("")
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default SearchableSelect
