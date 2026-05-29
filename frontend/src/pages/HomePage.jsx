import Navbar from "../components/Navbar";
import Card from "../components/Card";

const SERVICES = [
  {
    icon: "💊",
    title: "Prescription Management",
    description: "Easily order and manage your repeat prescriptions with our professional guidance.",
    gradient: "linear-gradient(135deg, #667eea22 0%, #764ba222 100%)",
  },
  {
    icon: "🏥",
    title: "Health Consulting",
    description: "Speak with our consultants about your healthcare needs and medication plans.",
    gradient: "linear-gradient(135deg, #f093fb22 0%, #f5576c22 100%)",
  },
  {
    icon: "🧪",
    title: "Lab Testing",
    description: "Book laboratory tests and get professional interpretation of your results.",
    gradient: "linear-gradient(135deg, #4facfe22 0%, #00f2fe22 100%)",
  },
  {
    icon: "🍎",
    title: "Wellness Plans",
    description: "Personalized wellness and nutrition plans to improve your overall health.",
    gradient: "linear-gradient(135deg, #43e97b22 0%, #38f9d722 100%)",
  },
  {
    icon: "📞",
    title: "24/7 Pharmacy Support",
    description: "Access to pharmaceutical support anytime you need it through our AI and experts.",
    gradient: "linear-gradient(135deg, #fa709a22 0%, #fee14022 100%)",
  },
  {
    icon: "📦",
    title: "Home Delivery",
    description: "Fast and reliable delivery of your medications directly to your doorstep.",
    gradient: "linear-gradient(135deg, #a18cd122 0%, #fbc2eb22 100%)",
  },
];

export default function HomePage() {
  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="hero-section">
        <div className="hero-badge">
          <span className="badge-dot"></span>
          Your Trusted Partner in Pharmaceutical Excellence
        </div>
        <h1 className="hero-title">How can we help your health today?</h1>
        <p className="hero-sub">
          Explore our services or chat with our AI assistant for instant medical guidance
        </p>
      </main>

      <section className="services-section">
        <div className="cards-grid">
          {SERVICES.map((svc) => (
            <Card key={svc.title} {...svc} />
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <p>© 2024 Pharma Premium · All rights reserved · <a href="#">Privacy Policy</a> · <a href="#">Terms of Service</a></p>
      </footer>
    </div>
  );
}
