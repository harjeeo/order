import Navbar from "./components/landing/Navbar";
import Hero from "./components/landing/Hero";
import LogoStrip from "./components/landing/LogoStrip";
import Highlights from "./components/landing/Highlights";
import ProductShowcase from "./components/landing/ProductShowcase";
import Features from "./components/landing/Features";
import Reviews from "./components/landing/Reviews";
import Pricing from "./components/landing/Pricing";
import Faq from "./components/landing/Faq";
import CtaContact from "./components/landing/CtaContact";
import Footer from "./components/landing/Footer";

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-(--color-canvas) text-(--color-text)">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[1400px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(35,131,226,0.16),transparent)]" />

      <Navbar />
      <main>
        <Hero />
        <LogoStrip />
        <Highlights />
        <ProductShowcase />
        <Features />
        <Reviews />
        <Pricing />
        <Faq />
        <CtaContact />
      </main>
      <Footer />
    </div>
  );
}
