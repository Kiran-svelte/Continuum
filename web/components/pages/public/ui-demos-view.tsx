import AnimatedSignInDemo from "@/components/ui/animated-sign-in-demo"
import { BackgroundPaperShadersDemo } from "@/components/ui/background-paper-shaders"
import { PulseBeamsFirstDemo } from "@/components/ui/pulse-beams"

export default function UiDemosView() {
  return (
    <main className="bg-black text-white">
      <section className="min-h-screen border-b border-white/10">
        <BackgroundPaperShadersDemo />
      </section>
      <section className="min-h-screen border-b border-white/10">
        <PulseBeamsFirstDemo />
      </section>
      <section className="min-h-screen">
        <AnimatedSignInDemo />
      </section>
    </main>
  )
}
