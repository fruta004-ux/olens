import { NextRequest, NextResponse } from "next/server"

const V0_API_KEY = process.env.V0_API_KEY

export async function POST(request: NextRequest) {
  try {
    console.log("V0_API_KEY 설정 여부:", !!V0_API_KEY)

    if (!V0_API_KEY) {
      return NextResponse.json(
        { error: "V0 API 키가 설정되지 않았습니다. .env.local 파일에 V0_API_KEY를 추가해주세요." },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { requirements, projectType } = body

    if (!requirements) {
      return NextResponse.json(
        { error: "요구사항을 입력해주세요." },
        { status: 400 }
      )
    }

    // v0 API용 프롬프트 구성
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

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("🚀 v0 API 호출 시작")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    // v0 API 호출
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
      const errorData = await v0Response.text()
      console.error("v0 API 오류:", errorData)
      return NextResponse.json(
        { error: "v0 API 호출에 실패했습니다.", details: errorData },
        { status: 500 }
      )
    }

    const v0Data = await v0Response.json()
    
    // 토큰 사용량 출력
    if (v0Data.usage) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.log("📊 v0 API 토큰 사용량")
      console.log(`  입력 토큰: ${v0Data.usage.prompt_tokens?.toLocaleString() || 0}`)
      console.log(`  출력 토큰: ${v0Data.usage.completion_tokens?.toLocaleString() || 0}`)
      console.log(`  총 토큰: ${v0Data.usage.total_tokens?.toLocaleString() || 0}`)
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    }

    const generatedCode = v0Data.choices?.[0]?.message?.content

    if (!generatedCode) {
      return NextResponse.json(
        { error: "v0에서 코드를 생성하지 못했습니다." },
        { status: 500 }
      )
    }

    console.log("✅ v0 코드 생성 완료, CodeSandbox 업로드 시작...")

    // 코드에서 실제 컴포넌트 부분 추출
    let componentCode = generatedCode
    
    // ```tsx 또는 ```jsx 블록 추출
    const codeBlockMatch = generatedCode.match(/```(?:tsx|jsx|javascript|typescript)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      componentCode = codeBlockMatch[1].trim()
    }

    // export default가 없으면 추가
    if (!componentCode.includes('export default')) {
      // 함수명 찾기
      const functionMatch = componentCode.match(/(?:function|const)\s+(\w+)/)
      if (functionMatch) {
        componentCode += `\n\nexport default ${functionMatch[1]};`
      } else {
        // 전체를 래핑
        componentCode = `export default function Demo() {\n  return (\n    <>${componentCode}</>\n  );\n}`
      }
    }

    // 'use client' 지시문 추가 (없으면)
    if (!componentCode.includes("'use client'") && !componentCode.includes('"use client"')) {
      componentCode = '"use client";\n\n' + componentCode
    }

    // CodeSandbox Define API용 파일 구조 생성
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

    // CodeSandbox Define API 호출
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
      const errorData = await sandboxResponse.text()
      console.error("CodeSandbox API 오류:", errorData)
      return NextResponse.json(
        { error: "CodeSandbox 생성에 실패했습니다.", details: errorData },
        { status: 500 }
      )
    }

    const sandboxData = await sandboxResponse.json()
    const sandboxId = sandboxData.sandbox_id

    const previewUrl = `https://${sandboxId}.csb.app`
    const editorUrl = `https://codesandbox.io/p/sandbox/${sandboxId}`

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("✅ 데모 생성 완료!")
    console.log(`🔗 미리보기: ${previewUrl}`)
    console.log(`📝 에디터: ${editorUrl}`)
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    return NextResponse.json({
      success: true,
      sandboxId,
      url: previewUrl,  // 미리보기 링크를 기본으로
      editorUrl,
      previewUrl,
    })
  } catch (error) {
    console.error("데모 생성 오류:", error)
    return NextResponse.json(
      { error: "데모 생성 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
