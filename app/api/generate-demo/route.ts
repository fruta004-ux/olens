import { NextRequest, NextResponse } from "next/server"
import { requireAuthApi } from "@/lib/auth-guard"
import { rateLimit, maybeCleanup } from "@/lib/rate-limit"

const V0_API_KEY = process.env.V0_API_KEY

const MAX_BODY_BYTES = 32 * 1024
const MAX_REQUIREMENTS_LEN = 8000

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuthApi()
    if (!guard.ok) return guard.response

    // v0 호출은 매우 비싸므로 더 엄격한 rate limit (10분에 5회)
    maybeCleanup()
    const rl = rateLimit({
      key: `demo:${guard.user.id}`,
      limit: 5,
      windowMs: 10 * 60 * 1000,
    })
    if (!rl.ok) {
      return NextResponse.json(
        { error: `너무 많은 요청. ${Math.ceil(rl.retryAfterMs / 1000)}초 후 다시 시도하세요.` },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      )
    }

    const contentLengthHeader = request.headers.get("content-length")
    if (contentLengthHeader && Number(contentLengthHeader) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "요청 본문이 너무 큽니다." }, { status: 413 })
    }

    if (!V0_API_KEY) {
      return NextResponse.json(
        { error: "V0 API 키가 설정되지 않았습니다." },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { requirements, projectType } = body as {
      requirements?: string
      projectType?: string
    }

    if (!requirements || typeof requirements !== "string" || !requirements.trim()) {
      return NextResponse.json(
        { error: "요구사항을 입력해주세요." },
        { status: 400 }
      )
    }
    if (requirements.length > MAX_REQUIREMENTS_LEN) {
      return NextResponse.json(
        { error: "요구사항이 너무 깁니다." },
        { status: 413 }
      )
    }

    const prompt = `Create a modern, beautiful demo UI for the following project requirements. 
Use React with Tailwind CSS. Make it responsive and visually appealing.
Include sample data to demonstrate the functionality.

Project Type: ${projectType || "웹 애플리케이션"}

Requirements:
${requirements}

Important:
- Use modern design patterns
- Include realistic sample/mock data
- Make it fully functional as a demo
- Use shadcn/ui components if applicable
- Export as a single page component`

    const v0Response = await fetch("https://api.v0.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${V0_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "v0-1.5-md",
        messages: [
          { role: "user", content: prompt }
        ],
        max_completion_tokens: 8000,
      }),
    })

    if (!v0Response.ok) {
      const errorText = await v0Response.text()
      console.error("v0 API 오류 status=", v0Response.status)
      return NextResponse.json(
        { error: "v0 API 호출에 실패했습니다.", details: errorText.slice(0, 500) },
        { status: 502 }
      )
    }

    const v0Data = await v0Response.json()
    const generatedCode = v0Data.choices?.[0]?.message?.content

    if (!generatedCode) {
      return NextResponse.json(
        { error: "v0에서 코드를 생성하지 못했습니다." },
        { status: 502 }
      )
    }

    let componentCode = generatedCode
    const codeBlockMatch = generatedCode.match(/```(?:tsx|jsx|javascript|typescript)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      componentCode = codeBlockMatch[1].trim()
    }

    if (!componentCode.includes('export default')) {
      const functionMatch = componentCode.match(/(?:function|const)\s+(\w+)/)
      if (functionMatch) {
        componentCode += `\n\nexport default ${functionMatch[1]};`
      } else {
        componentCode = `export default function Demo() {\n  return (\n    <>${componentCode}</>\n  );\n}`
      }
    }

    if (!componentCode.includes("'use client'") && !componentCode.includes('"use client"')) {
      componentCode = '"use client";\n\n' + componentCode
    }

    const files = {
      "package.json": {
        content: JSON.stringify({
          name: "v0-demo",
          version: "1.0.0",
          private: true,
          scripts: {
            dev: "next dev",
            build: "next build",
            start: "next start"
          },
          dependencies: {
            "next": "14.0.0",
            "react": "18.2.0",
            "react-dom": "18.2.0",
            "tailwindcss": "3.3.0",
            "autoprefixer": "10.4.16",
            "postcss": "8.4.31",
            "lucide-react": "0.294.0",
            "class-variance-authority": "0.7.0",
            "clsx": "2.0.0",
            "tailwind-merge": "2.1.0"
          },
          devDependencies: {
            "@types/node": "20.9.0",
            "@types/react": "18.2.37",
            "@types/react-dom": "18.2.15",
            "typescript": "5.2.2"
          }
        }, null, 2)
      },
      "tailwind.config.js": {
        content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`
      },
      "postcss.config.js": {
        content: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`
      },
      "app/globals.css": {
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;`
      },
      "app/layout.tsx": {
        content: `import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Demo Preview',
  description: 'Generated by v0',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  )
}`
      },
      "app/page.tsx": {
        content: `import Demo from '../components/Demo'

export default function Home() {
  return <Demo />
}`
      },
      "components/Demo.tsx": {
        content: componentCode
      },
      "next.config.js": {
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {}
module.exports = nextConfig`
      },
      "tsconfig.json": {
        content: JSON.stringify({
          compilerOptions: {
            target: "es5",
            lib: ["dom", "dom.iterable", "esnext"],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "preserve",
            incremental: true,
            plugins: [{ name: "next" }],
            paths: { "@/*": ["./*"] }
          },
          include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
          exclude: ["node_modules"]
        }, null, 2)
      }
    }

    const sandboxResponse = await fetch(
      "https://codesandbox.io/api/v1/sandboxes/define?json=1",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files }),
      }
    )

    if (!sandboxResponse.ok) {
      const errorText = await sandboxResponse.text()
      console.error("CodeSandbox API 오류 status=", sandboxResponse.status)
      return NextResponse.json(
        { error: "CodeSandbox 생성에 실패했습니다.", details: errorText.slice(0, 500) },
        { status: 502 }
      )
    }

    const sandboxData = await sandboxResponse.json()
    const sandboxId = sandboxData.sandbox_id

    const previewUrl = `https://${sandboxId}.csb.app`
    const editorUrl = `https://codesandbox.io/p/sandbox/${sandboxId}`

    return NextResponse.json({
      success: true,
      sandboxId,
      url: previewUrl,
      editorUrl,
      previewUrl,
    })
  } catch (error) {
    console.error("데모 생성 오류:", error instanceof Error ? error.message : "unknown")
    return NextResponse.json(
      { error: "데모 생성 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
