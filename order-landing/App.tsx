import Navbar from "./components/landing/Navbar";
import Hero from "./components/landing/Hero";
import Features from "./components/landing/Features";
import Apps from "./components/landing/Apps";
import Trusted from "./components/landing/Trusted";
import Pricing from "./components/landing/Pricing";
import CtaContact from "./components/landing/CtaContact";
import Reviews from "./components/landing/Reviews";
import Footer from "./components/landing/Footer";

export default function App() {
  return (
    <div className="min-h-screen bg-(--color-canvas) text-(--color-text)">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Apps />
        <Trusted />
        <Pricing />
        <CtaContact />
        <Reviews />
      </main>
      <Footer />
    </div>
  );
}
