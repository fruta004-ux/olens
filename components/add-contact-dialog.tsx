"use client"

import type React from "react"
import { useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface AddContactDialogProps {
  onSuccess?: () => void
}

export function AddContactDialog({ onSuccess }: AddContactDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    company: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    business_number: "",
    industry: "",
    notes: "",
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from("accounts")
        .insert([
          {
            company_name: formData.company,
            phone: formData.phone,
            email: formData.email || null,
            website: formData.website || null,
            address: formData.address || null,
            business_number: formData.business_number || null,
            industry: formData.industry || null,
          },
        ])
        .select()

      if (error) throw error

      setOpen(false)
      if (onSuccess) {
        onSuccess()
      }
      setFormData({
        company: "",
        phone: "",
        email: "",
        website: "",
        address: "",
        business_number: "",
        industry: "",
        notes: "",
      })
    } catch (error) {
      console.error("[v0] 거래처 추가 오류:", error)
      alert("거래처 추가 중 오류가 발생했습니다.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />새 연락처 추가
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="px-6 py-6">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-2xl">거래처 생성</SheetTitle>
            <SheetDescription>상호명과 전화번호만 입력하면 빠르게 생성할 수 있습니다.</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">필수 정보</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="company" className="text-sm font-medium">
                    상호명 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="company"
                    placeholder="(주)클루터"
                    required
                    className="h-10"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    전화번호 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="02-1234-5678"
                    required
                    className="h-10"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">추가 정보 (선택사항)</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                    이메일
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="info@company.com"
                    className="h-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="website" className="text-sm font-medium text-muted-foreground">
                    웹사이트
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://company.com"
                    className="h-10"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address" className="text-sm font-medium text-muted-foreground">
                    주소
                  </Label>
                  <Input
                    id="address"
                    placeholder="서울시 강남구..."
                    className="h-10"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="business_number" className="text-sm font-medium text-muted-foreground">
                      사업자번호
                    </Label>
                    <Input
                      id="business_number"
                      placeholder="123-45-67890"
                      className="h-10"
                      value={formData.business_number}
                      onChange={(e) => setFormData({ ...formData, business_number: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="industry" className="text-sm font-medium text-muted-foreground">
                      업종
                    </Label>
                    <Input
                      id="industry"
                      placeholder="IT/소프트웨어"
                      className="h-10"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="sticky bottom-0 bg-background border-t px-6 py-4">
          <SheetFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              취소
            </Button>
            <Button type="submit" onClick={handleSubmit} className="flex-1" disabled={saving}>
              {saving ? "생성 중..." : "생성"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default AddContactDialog
