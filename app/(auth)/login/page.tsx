"use client"

import * as React from "react"
import { Coffee, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { loginAction } from "@/lib/actions/auth"

export default function LoginPage() {
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    try {
      const result = await loginAction(formData)
      if (result?.error) {
        setError(result.error)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#F8F3E9]">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#43291F] text-[#FFFDF8] mb-4 shadow-lg border-2 border-[#E8DED0]">
            <Coffee className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#43291F] tracking-tight">
            Heaven&apos;s Cafe
          </h1>
          <p className="text-xs uppercase tracking-widest text-[#737B52] font-semibold mt-1">
            POS, Billing & Business Management
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center text-[#43291F]">
              Sign in to your account
            </CardTitle>
            <CardDescription className="text-center text-[#705B51]">
              Enter your credentials to access Admin or Shop POS
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#A09289]" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@heavenscafe.com"
                    required
                    className="pl-9 bg-[#FFFDF8]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#A09289]" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="pl-9 bg-[#FFFDF8]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#43291F] hover:bg-[#341F17] text-[#FFFDF8] h-11 text-sm font-semibold"
              >
                {loading ? "Authenticating..." : "Sign In to Terminal"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* System Notice */}
        <div className="mt-6 text-center text-xs text-[#705B51]">
          <p className="flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="h-4 w-4 text-[#737B52]" />
            Role-Enforced Remote Administration & Shop POS
          </p>
          <p className="mt-1 text-[11px] text-[#A09289]">
            Admin users are redirected to Management Dashboard.
            <br />
            Managers are automatically routed to Shop Point of Sale.
          </p>
        </div>
      </div>
    </div>
  )
}
